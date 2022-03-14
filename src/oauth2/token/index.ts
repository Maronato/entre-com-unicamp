import { getPrisma } from "@/utils/db"
import { signJWT, verifyJWT } from "@/utils/jwt"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { Client } from "../client"
import { ResourceOwner } from "../resourceOwner"

export type AccessTokenType = "access_token"
export type RefreshTokenType = "refresh_token"
export type TokenType = AccessTokenType | RefreshTokenType

type TokenPayload = {
  user: Pick<ResourceOwner, "email" | "id">
  type: TokenType
  scope: string[]
}

const createToken =
  (tokenType: TokenType, expirationTime: string | false) =>
  async (client: Client, resourceOwner: ResourceOwner, scope: string[]) => {
    return startActiveSpan(`createToken`, async (span) => {
      span.setAttributes({
        tokenType,
        expirationTime,
        client: client.id,
        resourceOwner: resourceOwner.id,
        scope,
      })

      const payload: TokenPayload = {
        user: { id: resourceOwner.id, email: resourceOwner.email },
        type: tokenType,
        scope,
      }
      return signJWT(
        { ...payload },
        client.clientId,
        expirationTime || undefined
      )
    })
  }

const createAccessToken = createToken("access_token", "2h")

const createRefreshToken = createToken("refresh_token", false)

const createTokenByType = (type: TokenType) =>
  type === "access_token" ? createAccessToken : createRefreshToken

class Token {
  static type: TokenType
  token: string
  jti: string
  scope: string[]
  client: Client
  resourceOwner: ResourceOwner

  constructor(
    token: string,
    jti: string,
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[]
  ) {
    this.token = token
    this.jti = jti
    this.scope = scope
    this.client = client
    this.resourceOwner = resourceOwner
  }

  static async create<T extends typeof Token>(
    this: T,
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[]
  ): Promise<InstanceType<T>> {
    return startActiveSpan(`<Token> ${this.name}.create`, async (span) => {
      span.setAttributes({
        client: client.id,
        resourceOwner: resourceOwner.id,
        scope,
      })

      const factory = createTokenByType(this.type)
      const tokenString = await factory(client, resourceOwner, scope)
      const token = await this.parseToken(tokenString)
      if (!token) {
        throw new Error("Error creating token")
      }
      return token
    })
  }

  static async parseToken<T extends typeof Token>(
    this: T,
    token: string
  ): Promise<InstanceType<T> | undefined> {
    return startActiveSpan(
      `<Token> ${this.name}.parseToken`,
      async (span, setError) => {
        const result = await verifyJWT<TokenPayload>(token)
        if (!result) {
          setError("Token failed verification")
          return
        }

        const { type, user, aud = "", scope, jti } = result

        span.setAttributes({
          type,
          user: user.id,
          aud,
          scope,
          jti,
          valid: false,
        })

        if (type === this.type) {
          const [resourceOwner, client] = await Promise.all([
            ResourceOwner.get(user.id),
            Client.getByClientID(Array.isArray(aud) ? aud[0] : aud),
          ])
          if (resourceOwner && client) {
            span.setAttribute("valid", true)

            return new this(
              token,
              jti,
              client,
              resourceOwner,
              scope
            ) as InstanceType<T>
          }
        }
      }
    )
  }

  static async verifyToken<T extends typeof Token>(
    this: T,
    token: string
  ): Promise<InstanceType<T> | undefined> {
    return startActiveSpan(`<Token> ${this.name}.verifyToken`, async () => {
      const tokenInstance = await this.parseToken(token)
      if (!tokenInstance) {
        return
      }
      const prisma = getPrisma()
      const revoked = await prisma.revoked_tokens.count({
        where: { jti: tokenInstance.jti },
      })
      if (revoked > 0) {
        return
      }
      return tokenInstance
    })
  }

  static async revoke(token: string) {
    return startActiveSpan(`<Token> ${this.name}.revoke`, async () => {
      const tokenInstance = await this.verifyToken(token)
      if (tokenInstance) {
        const prisma = getPrisma()
        await prisma.revoked_tokens.create({
          data: {
            jti: tokenInstance.jti,
            type: this.type,
            client: BigInt(tokenInstance.client.id),
            resource_owner: BigInt(tokenInstance.resourceOwner.id),
          },
        })
      }
    })
  }
}

export class AccessToken extends Token {
  static type: AccessTokenType = "access_token"
}

export class RefreshToken extends Token {
  static type: RefreshTokenType = "refresh_token"
}

export async function verifyToken(token: string) {
  return startActiveSpan("verifyToken", async () => {
    let tokenInstance: AccessToken | RefreshToken | undefined =
      await AccessToken.verifyToken(token)
    if (!tokenInstance) {
      tokenInstance = await RefreshToken.verifyToken(token)
    }
    return tokenInstance
  })
}
