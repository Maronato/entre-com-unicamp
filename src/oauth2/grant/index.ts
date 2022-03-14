import { createHash } from "crypto"

import { SignJWT, jwtVerify } from "jose"

import { ALGORITHM, getJWKS, getPrivateKey, ISSUER, TYPE } from "@/utils/jwk"
import { createRandomString } from "@/utils/random"
import { startActiveSpan } from "@/utils/telemetry/trace"

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

export async function createCodeGrant(
  clientID: string,
  userID: string,
  scope: string[],
  redirectURI: string,
  state?: string
): Promise<AuthorizationCodeGrant>
export async function createCodeGrant(
  clientID: string,
  userID: string,
  scope: string[],
  redirectURI: string,
  codeChallenge: string,
  codeChallengeMethod: CodeChallengeMethod,
  state?: string
): Promise<AuthorizationCodeGrant>
export async function createCodeGrant(
  clientID: string,
  userID: string,
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
      userID,
      scope,
      redirectURI,
      state,
      codeChallenge,
      codeChallengeMethod,
    })

    const payload = {
      clientID,
      userID,
      scope,
      redirectURI,
      codeChallenge,
      codeChallengeMethod,
      state,
    } as GrantPayload

    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: ALGORITHM, typ: TYPE })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(clientID)
      .setJti(createRandomString(12))
      .setExpirationTime("2m")
      .sign(await getPrivateKey())
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
): Promise<BaseGrantPayload | null>
export async function verifyCodeGrant(
  token: string,
  clientID: string,
  redirectURI: string,
  codeVerifier: string
): Promise<CodeChallengeGrantPayload | null>
export async function verifyCodeGrant(
  token: string,
  clientID: string,
  redirectURI: string,
  codeVerifier?: string
): Promise<GrantPayload | null> {
  return startActiveSpan("verifyCodeGrant", async (span, setError) => {
    span.setAttributes({
      clientID,
      redirectURI,
      codeVerifier,
    })

    const jwks = await getJWKS()
    try {
      const result = await jwtVerify(token, jwks, {
        algorithms: [ALGORITHM],
        audience: clientID,
        issuer: ISSUER,
        typ: TYPE,
      })
      const payload = result.payload as unknown as GrantPayload

      if (
        redirectURI !== payload.redirectURI ||
        clientID !== payload.clientID
      ) {
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
    } catch (e) {
      setError("Failed to jwtVerify")
      return null
    }
  })
}
