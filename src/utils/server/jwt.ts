import { KeyObject, createPublicKey } from "crypto"

import {
  importJWK,
  createLocalJWKSet,
  exportJWK,
  SignJWT,
  JWTPayload,
  jwtVerify,
  importPKCS8,
  JSONWebKeySet,
} from "jose"

import { createRandomString } from "@/utils/common/random"

import { getSecret } from "./secrets"
import { getLogger } from "./telemetry/logs"
import { startActiveSpan } from "./telemetry/trace"

export const ALGORITHM = "ES256"
export const ISSUER = "entre-com-unicamp.com"
const TYPE = "JWT"

// GENERATE YOUR KEY FOR PRODUCTION!
const DEFAULT_PRIVATE_KEY =
  '{"kty":"EC","x":"f-Ix02u9TbSSPZDuVHkdJuG0GDCqqpczasp8rd2Y-yM","y":"LPO4N2PC5G3JgrvuchnnJwhmkkL8SbEl4iYxs0h1r7U","crv":"P-256","d":"L-pJifhr1qAmWSvrsfOtR71aZFRr_P9gu9W_08uHDdQ"}'

function getPrivateKey(): Promise<KeyObject> {
  const logger = getLogger()
  return startActiveSpan("getPrivateKey", async (_, setError) => {
    // In production, look for secrets
    if (process.env.NODE_ENV === "production") {
      return getSecret(
        "jwt-private-ke",
        async (secret) => (await importPKCS8(secret, ALGORITHM)) as KeyObject
      )
    } else {
      // In development, use the default key
      let key = process.env.JWT_PRIVATE_KEY
      if (!key) {
        logger.warn("JWT_PRIVATE_KEY is not set")
        setError("JWT_PRIVATE_KEY is not set")
        key = DEFAULT_PRIVATE_KEY
      }
      return (await importJWK(JSON.parse(key), ALGORITHM)) as KeyObject
    }
  })
}

let cachedPub: KeyObject | undefined = undefined
async function getPublicKey() {
  return startActiveSpan("getPublicKey", async () => {
    if (!cachedPub) {
      cachedPub = createPublicKey(await getPrivateKey())
    }
    return cachedPub
  })
}

export async function getJSONWebKeySet(): Promise<JSONWebKeySet> {
  return startActiveSpan("getJSONWebKeySet", async () => ({
    keys: [await exportJWK(await getPublicKey())],
  }))
}

async function getJWKS() {
  return startActiveSpan("getJWKS", async () =>
    createLocalJWKSet(await getJSONWebKeySet())
  )
}

type Audience = JWTPayload["aud"]
type Subject = JWTPayload["sub"]

export async function signJWT(
  payload: JWTPayload,
  audience?: Audience,
  subject?: Subject,
  expirationTime?: string | number
): Promise<string>
export async function signJWT(
  payload: JWTPayload,
  audience: Audience,
  subject: Subject,
  expirationTime: string | number | undefined,
  returnJTI: true
): Promise<[string, string]>
export async function signJWT(
  payload: JWTPayload,
  audience?: Audience,
  subject?: Subject,
  expirationTime?: string | number,
  returnJTI = false
): Promise<string | [string, string]> {
  return startActiveSpan("signJWT", async (span) => {
    span.setAttributes({
      payload: JSON.stringify(payload),
      audience,
      expirationTime,
      returnJTI,
    })

    const jti = payload.jti || createRandomString(12)
    span.setAttribute("jti", jti)

    let token = new SignJWT({ ...payload })
      .setProtectedHeader({ alg: ALGORITHM, typ: TYPE })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setJti(jti)

    if (audience) {
      token = token.setAudience(audience)
    }
    if (subject) {
      token = token.setSubject(subject)
    }
    if (expirationTime) {
      token = token.setExpirationTime(expirationTime)
    }
    const signed = await token.sign(await getPrivateKey())
    if (returnJTI) {
      return [signed, jti] as [string, string]
    }
    return signed
  })
}

export type ExtendJWTPayload<T> = T &
  JWTPayload &
  Required<Pick<JWTPayload, "jti" | "iss" | "iat">>

export async function verifyJWT<T extends JWTPayload = JWTPayload>(
  token: string,
  audience?: Audience,
  subject?: Subject
): Promise<ExtendJWTPayload<T> | null> {
  return startActiveSpan("verifyJWT", async (span, setError) => {
    span.setAttributes({
      audience,
      subject,
      algorithm: ALGORITHM,
      issuer: ISSUER,
      type: TYPE,
    })

    const jwks = await getJWKS()
    try {
      const { payload } = await jwtVerify(token, jwks, {
        audience,
        subject,
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        typ: TYPE,
      })
      return payload as unknown as T & ExtendJWTPayload<T>
    } catch (e) {
      setError("Token verification failed")
      return null
    }
  })
}
