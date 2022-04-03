import { createHash } from "crypto"

import { signJWT, verifyJWT } from "@/utils/server/jwt"
import { getRedis } from "@/utils/server/redis"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { Scope } from "../scope"
import { cacheIDNonce } from "../token/create"
import { User } from "../user"

export type CodeChallengeMethod = "plain" | "S256"

type BaseGrantPayload = {
  scope: Scope[]
  type: "access_code"
  redirectURI: string
  aud: string
  sub: string
  state?: string
}

type BasicGrantPayload = BaseGrantPayload & {
  codeChallenge: undefined
  codeChallengeMethod: undefined
}

type CodeChallengeGrantPayload = BaseGrantPayload & {
  codeChallenge: string
  codeChallengeMethod: CodeChallengeMethod
}

type GrantPayload = CodeChallengeGrantPayload | BasicGrantPayload

export type AuthorizationCodeGrant = string

const codeGrantTTL = "2m"
const codeGrantTTLSeconds = 60 * 2

type State = {
  state?: string
  nonce?: string
}

export async function createCodeGrant(
  clientID: string,
  userID: User["id"],
  scope: Scope[],
  redirectURI: string,
  stateD?: State
): Promise<AuthorizationCodeGrant>
export async function createCodeGrant(
  clientID: string,
  userID: User["id"],
  scope: Scope[],
  redirectURI: string,
  codeChallenge: string,
  codeChallengeMethod: CodeChallengeMethod,
  stateD?: State
): Promise<AuthorizationCodeGrant>
export async function createCodeGrant(
  clientID: string,
  userID: User["id"],
  scope: Scope[],
  redirectURI: string,
  stateDOrCodeChallenge?: string | State,
  codeChallengeMethod?: CodeChallengeMethod,
  maybeStateD?: State
): Promise<AuthorizationCodeGrant> {
  return startActiveSpan("createCodeGrant", async (span) => {
    const [stateD, codeChallenge] = codeChallengeMethod
      ? [maybeStateD as State | undefined, stateDOrCodeChallenge as string]
      : [stateDOrCodeChallenge as State | undefined, undefined]

    const { state, nonce } =
      typeof stateD === "string" ? ({ state: stateD } as State) : stateD || {}

    span.setAttributes({
      clientID,
      userID,
      scope,
      redirectURI,
      state,
      nonce,
      codeChallenge,
      codeChallengeMethod,
    })

    if (nonce) {
      await cacheIDNonce(clientID, nonce)
    }

    const payload = {
      scope,
      redirectURI,
      codeChallenge,
      codeChallengeMethod,
      state,
      type: "access_code",
    } as GrantPayload

    return await signJWT(payload, clientID, userID, codeGrantTTL)
  })
}

function generateS256CodeChallenge(codeVerifier: string): string {
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

function verifyCodeChallenge(
  codeVerifier: string | undefined,
  codeChallenge: string,
  codeChallengeMethod: CodeChallengeMethod
) {
  if (!codeVerifier) {
    return false
  }
  if (codeChallengeMethod === "plain") {
    return codeVerifier === codeChallenge
  }
  return codeChallenge === generateS256CodeChallenge(codeVerifier)
}

export async function verifyCodeGrant(
  token: string,
  clientID: string,
  redirectURI: string
): Promise<(BaseGrantPayload & { jti: string }) | null>
export async function verifyCodeGrant(
  token: string,
  clientID: string,
  redirectURI: string,
  codeVerifier: string
): Promise<(CodeChallengeGrantPayload & { jti: string }) | null>
export async function verifyCodeGrant(
  token: string,
  clientID: string,
  redirectURI: string,
  codeVerifier?: string
): Promise<(GrantPayload & { jti: string }) | null> {
  return startActiveSpan("verifyCodeGrant", async (span, setError) => {
    span.setAttributes({
      clientID,
      redirectURI,
      codeVerifier,
    })

    const payload = await verifyJWT<GrantPayload>(token, clientID)

    if (
      !payload ||
      payload.type !== "access_code" ||
      (await isGrantRevoked(payload.jti))
    ) {
      setError("Invalid token")
      return null
    }

    if (redirectURI !== payload.redirectURI || clientID !== payload.aud) {
      setError("Invalid redirectURI or clientID")
      return null
    }

    if (
      "codeChallenge" in payload &&
      payload.codeChallenge &&
      !verifyCodeChallenge(
        codeVerifier,
        payload.codeChallenge,
        payload.codeChallengeMethod
      )
    ) {
      setError("Invalid code verifier")
      return null
    }
    return payload
  })
}

const getRevokedGrantKey = (jti: string) => `code-grant-revoked-${jti}`

export const revokeGrant = async (jti: string) => {
  return startActiveSpan("revokeGrant", async (span) => {
    span.setAttributes({
      jti,
      ex: codeGrantTTLSeconds,
    })

    const redis = await getRedis()

    const key = getRevokedGrantKey(jti)
    span.setAttribute("key", key)

    await redis.set(key, "expired", codeGrantTTLSeconds, true)
  })
}
const isGrantRevoked = async (jti: string) => {
  return startActiveSpan("isGrantRevoked", async (span) => {
    span.setAttribute("jti", jti)

    const redis = await getRedis()

    const key = getRevokedGrantKey(jti)
    span.setAttribute("key", key)

    const value = await redis.get(key)
    span.setAttribute("is_revoked", value !== null)

    return value !== null
  })
}
