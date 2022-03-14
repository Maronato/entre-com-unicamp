import { KeyObject, createPublicKey } from "crypto"

import {
  importJWK,
  createLocalJWKSet,
  exportJWK,
  JSONWebKeySet,
  SignJWT,
  JWTPayload,
  jwtVerify,
} from "jose"

import { createRandomString } from "./random"
import { startActiveSpan } from "./telemetry/trace"

export const ALGORITHM = "ES256"
export const ISSUER = "entre-com-unicamp.com"
export const TYPE = "JWT"

export function getPrivateKey(): Promise<KeyObject> {
  return startActiveSpan(
    "getPrivateKey",
    () =>
      importJWK(
        JSON.parse(process.env.JWT_PRIVATE_KEY || ""),
        ALGORITHM
      ) as Promise<KeyObject>
  )
}

async function getPublicKey() {
  return startActiveSpan("getPublicKey", async () =>
    createPublicKey(await getPrivateKey())
  )
}

export async function getJSONWebKeySet(): Promise<JSONWebKeySet> {
  return startActiveSpan("getJSONWebKeySet", async () => ({
    keys: [await exportJWK(await getPublicKey())],
  }))
}

export async function getJWKS() {
  return startActiveSpan("getJWKS", async () =>
    createLocalJWKSet(await getJSONWebKeySet())
  )
}

export async function signJWT(
  payload: JWTPayload,
  audience?: string | string[],
  expirationTime?: string | number
): Promise<string>
export async function signJWT(
  payload: JWTPayload,
  audience: string | string[] | undefined,
  expirationTime: string | number | undefined,
  returnJTI: true
): Promise<[string, string]>
export async function signJWT(
  payload: JWTPayload,
  audience?: string | string[],
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

    const jti = createRandomString(12)
    span.setAttribute("jti", jti)

    let token = new SignJWT({ ...payload })
      .setProtectedHeader({ alg: ALGORITHM, typ: TYPE })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setJti(jti)

    if (audience) {
      token = token.setAudience(audience)
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

type Audience = JWTPayload["aud"]

type ExtendedJWTPayload = JWTPayload &
  Required<Pick<JWTPayload, "jti" | "iss" | "iat">>

export async function verifyJWT<T extends JWTPayload = JWTPayload>(
  token: string,
  audience?: Audience
): Promise<(T & ExtendedJWTPayload) | null> {
  return startActiveSpan("verifyJWT", async (span, setError) => {
    span.setAttributes({
      audience,
      algorithm: ALGORITHM,
      issuer: ISSUER,
      type: TYPE,
    })

    const jwks = await getJWKS()
    try {
      const { payload } = await jwtVerify(token, jwks, {
        audience,
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        typ: TYPE,
      })
      return payload as unknown as T & ExtendedJWTPayload
    } catch (e) {
      setError("Token verification failed")
      return null
    }
  })
}
