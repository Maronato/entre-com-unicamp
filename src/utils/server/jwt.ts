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
  JWK,
  calculateJwkThumbprint,
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

function getPrivateKeys(): Promise<KeyObject[]> {
  const logger = getLogger()
  return startActiveSpan("getPrivateKeys", async (_, setError) => {
    // In production, look for secrets
    if (process.env.NODE_ENV === "production") {
      return getSecret("jwt-private-ke", async (secret) => [
        (await importPKCS8(secret, ALGORITHM)) as KeyObject,
      ])
    } else {
      // In development, use the default key
      let key = process.env.JWT_PRIVATE_KEY
      if (!key) {
        logger.warn("JWT_PRIVATE_KEY is not set")
        setError("JWT_PRIVATE_KEY is not set")
        key = DEFAULT_PRIVATE_KEY
      }
      return [(await importJWK(JSON.parse(key), ALGORITHM)) as KeyObject]
    }
  })
}

type Keypair = { priv: KeyObject; pub: KeyObject }
function getKeypair(privateKey: KeyObject): Keypair {
  return startActiveSpan("getKeypair", () => {
    const publicKey = createPublicKey(privateKey)
    return {
      priv: privateKey,
      pub: publicKey,
    }
  })
}

async function generateJWK(key: KeyObject): Promise<JWK> {
  return startActiveSpan("generateJWK", async () => {
    const jwk = await exportJWK(key)
    const kid = await calculateJwkThumbprint(jwk)
    return { ...jwk, kid }
  })
}

type PrivateAndJWK = {
  priv: KeyObject
  jwk: JWK
}
async function generatePrivateAndJWK(
  privateKey: KeyObject
): Promise<PrivateAndJWK> {
  return startActiveSpan("generatePrivateAndJWK", async () => {
    const keypair = getKeypair(privateKey)
    const jwk = await generateJWK(keypair.pub)
    return {
      priv: keypair.priv,
      jwk,
    }
  })
}

const cachedPJWK: PrivateAndJWK[] = []
async function getPrivateAndJWKs(): Promise<PrivateAndJWK[]> {
  return startActiveSpan("generatePrivateAndJWK", async () => {
    if (cachedPJWK.length === 0) {
      const keys = await getPrivateKeys()
      const jwks = await Promise.all(keys.map(generatePrivateAndJWK))
      cachedPJWK.push(...jwks)
    }
    return cachedPJWK
  })
}

async function choosePrivateAndJWK(): Promise<PrivateAndJWK> {
  return startActiveSpan("choosePrivateAndJWK", async () => {
    const keys = await getPrivateAndJWKs()
    // Maybe choose at random
    return keys[0]
  })
}

export async function getJSONWebKeySet(): Promise<JSONWebKeySet> {
  return startActiveSpan("getJSONWebKeySet", async () => {
    const jwks = await getPrivateAndJWKs()
    return {
      keys: jwks.map((pjwk) => pjwk.jwk),
    }
  })
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

    const {
      jwk: { kid },
      priv,
    } = await choosePrivateAndJWK()

    span.setAttributes({ jti, kid })

    let token = new SignJWT({ ...payload })
      .setProtectedHeader({ alg: ALGORITHM, typ: TYPE, kid })
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
    const signed = await token.sign(priv)
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
