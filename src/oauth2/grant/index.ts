import { createHash } from "crypto"

import { signJWT, verifyJWT } from "@/utils/jwt"
import { getRedis } from "@/utils/redis"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { User } from "../user"

export type CodeChallengeMethod = "plain" | "S256"

type BaseGrantPayload = {
  clientID: string
  userID: string
  scope: string[]
  redirectURI: string
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

export async function createCodeGrant(
  clientID: string,
  userID: User["id"],
  scope: string[],
  redirectURI: string,
  state?: string
): Promise<AuthorizationCodeGrant>
export async function createCodeGrant(
  clientID: string,
  userID: User["id"],
  scope: string[],
  redirectURI: string,
  codeChallenge: string,
  codeChallengeMethod: CodeChallengeMethod,
  state?: string
): Promise<AuthorizationCodeGrant>
export async function createCodeGrant(
  clientID: string,
  userID: User["id"],
  scope: string[],
  redirectURI: string,
  stateOrCodeChallenge?: string,
  codeChallengeMethod?: CodeChallengeMethod,
  maybeState?: string
): Promise<AuthorizationCodeGrant> {
  return startActiveSpan("createCodeGrant", async (span) => {
    const [state, codeChallenge] = codeChallengeMethod
      ? [maybeState, stateOrCodeChallenge]
      : [stateOrCodeChallenge, undefined]

    span.setAttributes({
      clientID,
      userID: userID.toString(),
      scope,
      redirectURI,
      state,
      codeChallenge,
      codeChallengeMethod,
    })

    const payload = {
      clientID,
      userID: userID.toString(),
      scope,
      redirectURI,
      codeChallenge,
      codeChallengeMethod,
      state,
    } as GrantPayload

    return await signJWT(payload, clientID, codeGrantTTL)
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

    if (!payload || (await isGrantRevoked(payload.jti))) {
      setError("Invalid token")
      return null
    }

    if (redirectURI !== payload.redirectURI || clientID !== payload.clientID) {
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

    await redis.set(key, "expired", { EX: codeGrantTTLSeconds, NX: true })
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
