import { createHash } from "crypto"

import { grants } from "@prisma/client"
import { addSeconds, isAfter } from "date-fns"

import { getPrisma } from "@/utils/db"
import { createRandomString } from "@/utils/random"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { Client } from "../client"
import { ResourceOwner } from "../resourceOwner"

export type CodeChallengeMethod = "plain" | "S256"

class BaseAuthorizationCodeGrant {
  id: string
  client: Client
  resourceOwner: ResourceOwner
  scope: string[]
  code: string
  createdAt: Date
  expiresIn: number
  state?: string
  redirectUri: string

  constructor(
    id: string,
    code: string,
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[],
    createdAt: Date,
    expiresIn: number,
    redirectUri: string,
    state?: string
  ) {
    this.id = id
    this.code = code
    this.client = client
    this.resourceOwner = resourceOwner
    this.scope = scope
    this.createdAt = createdAt
    this.expiresIn = expiresIn
    this.redirectUri = redirectUri
    this.state = state
  }

  isExpired(): boolean {
    return isAfter(new Date(), addSeconds(this.createdAt, this.expiresIn))
  }

  isValid(redirectUri: string) {
    return !this.isExpired() && this.redirectUri === redirectUri
  }

  static async _get(client: Client, code: string) {
    return startActiveSpan(
      "BaseAuthorizationCodeGrant._get",
      async (span, setError) => {
        span.setAttributes({
          code,
          client: client.id,
        })

        const prisma = getPrisma()
        const grant = await prisma.grants.findFirst({
          where: { client: Number(client.id), code },
        })
        if (grant) {
          const [, client, resourceOwner] = await Promise.all([
            // Prevent replay attacks by deleting the grant
            prisma.grants.delete({ where: { id: grant.id } }),
            Client.get(grant.client.toString()),
            ResourceOwner.get(grant.resource_owner.toString()),
          ])
          if (resourceOwner && client) {
            return [grant, client, resourceOwner] as [
              grants,
              Client,
              ResourceOwner
            ]
          } else {
            setError(`Failed to find client or resourceOwner`)
          }
        } else {
          setError(`Failed to find grant`)
        }
      }
    )
  }
}

export class AuthorizationCodeGrant extends BaseAuthorizationCodeGrant {
  static async create(
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[],
    redirectUri: string,
    state?: string
  ) {
    const prisma = getPrisma()
    const code = createRandomString(24)
    const grant = await prisma.grants.create({
      data: {
        code,
        scope,
        state,
        redirect_uri: redirectUri,
        client: BigInt(client.id),
        resource_owner: BigInt(resourceOwner.id),
      },
    })
    return new AuthorizationCodeGrant(
      grant.id.toString(),
      grant.code,
      client,
      resourceOwner,
      scope,
      grant.created_at,
      grant.expires_in,
      redirectUri,
      state
    )
  }

  static async _fromResponse(response: [grants, Client, ResourceOwner]) {
    const [grant, client, resourceOwner] = response
    return new AuthorizationCodeGrant(
      grant.id.toString(),
      grant.code,
      client,
      resourceOwner,
      grant.scope,
      grant.created_at,
      grant.expires_in,
      grant.redirect_uri,
      grant.state || undefined
    )
  }

  static async get(client: Client, code: string) {
    return startActiveSpan("AuthorizationCodeGrant.get", async (span) => {
      span.setAttributes({
        code,
        client: client.id,
      })

      const response = await this._get(client, code)
      if (response) {
        return this._fromResponse(response)
      }
    })
  }
}

function generateCodeChallenge(codeVerifier: string): string {
  try {
    return createHash("sha256")
      .update(Buffer.from(codeVerifier))
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
  } catch (e) {
    return ""
  }
}

export class AuthorizationCodePKCEGrant extends BaseAuthorizationCodeGrant {
  codeChallenge: string
  codeChallengeMethod: CodeChallengeMethod

  constructor(
    id: string,
    code: string,
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[],
    createdAt: Date,
    expiresIn: number,
    redirectUri: string,
    codeChallenge: string,
    codeChallengeMethod: CodeChallengeMethod,
    state?: string
  ) {
    super(
      id,
      code,
      client,
      resourceOwner,
      scope,
      createdAt,
      expiresIn,
      redirectUri,
      state
    )
    this.codeChallenge = codeChallenge
    this.codeChallengeMethod = codeChallengeMethod
  }

  check(codeVerifier?: string): boolean {
    if (!codeVerifier) {
      return false
    }
    switch (this.codeChallengeMethod) {
      case "plain":
        return this.codeChallenge === codeVerifier
      case "S256":
        return (
          codeVerifier.length > 0 &&
          this.codeChallenge === generateCodeChallenge(codeVerifier)
        )
      default:
        return false
    }
  }

  static async create(
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[],
    redirectUri: string,
    codeChallenge: string,
    codeChallengeMethod: CodeChallengeMethod,
    state?: string
  ) {
    return startActiveSpan(
      "AuthorizationCodePKCEGrant.create",
      async (span) => {
        span.setAttributes({
          scope,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          state,
          client: client.id,
          resourceOwner: resourceOwner.id,
        })
        const prisma = getPrisma()
        const code = createRandomString(24)
        const grant = await prisma.grants.create({
          data: {
            code,
            scope,
            state,
            redirect_uri: redirectUri,
            client: BigInt(client.id),
            resource_owner: BigInt(resourceOwner.id),
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
          },
        })
        return new AuthorizationCodePKCEGrant(
          grant.id.toString(),
          grant.code,
          client,
          resourceOwner,
          scope,
          grant.created_at,
          grant.expires_in,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          state
        )
      }
    )
  }

  static async get(client: Client, code: string) {
    return startActiveSpan("AuthorizationCodePKCEGrant.get", async (span) => {
      span.setAttributes({
        code,
        client: client.id,
      })

      const response = await this._get(client, code)
      if (response) {
        const [grant, client, resourceOwner] = response
        if (grant.code_challenge) {
          return new AuthorizationCodePKCEGrant(
            grant.id.toString(),
            grant.code,
            client,
            resourceOwner,
            grant.scope,
            grant.created_at,
            grant.expires_in,
            grant.redirect_uri,
            grant.code_challenge,
            grant.code_challenge_method as CodeChallengeMethod,
            grant.state || undefined
          )
        } else {
          return AuthorizationCodeGrant._fromResponse(response)
        }
      }
    })
  }
}

export type Grant = AuthorizationCodeGrant | AuthorizationCodePKCEGrant

export async function getGrant(client: Client, code: string) {
  return startActiveSpan("getGrant", (span) => {
    span.setAttributes({
      code,
      client: client.id,
    })
    return AuthorizationCodePKCEGrant.get(client, code)
  })
}
