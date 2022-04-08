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
import { startActiveSpan } from "./telemetry/trace"

export enum ALGORITHM {
  RS256 = "RS256",
  ES256 = "ES256",
}
export const ISSUER = "entre-com-unicamp.com"
const TYPE = "JWT"

// GENERATE YOUR KEY FOR PRODUCTION!
const DEFAULT_ACCESS_KEY =
  '{"kty":"EC","x":"f-Ix02u9TbSSPZDuVHkdJuG0GDCqqpczasp8rd2Y-yM","y":"LPO4N2PC5G3JgrvuchnnJwhmkkL8SbEl4iYxs0h1r7U","crv":"P-256","d":"L-pJifhr1qAmWSvrsfOtR71aZFRr_P9gu9W_08uHDdQ"}'
const DEFAULT_ID_KEY =
  '{"kty":"RSA","n":"vQUgVJE980SLgIZacVvRX6cF-ciflbtdAJMASUUL-ER3Z7qa72Yb9CFZivmFwnAFjzgD4z2FubR0oVqSA_E1z8QH3ZQV7Jdw7EmwftWQPONb4-wnn9SN1km6h6rOk5LqQgJwTHUNVmylCSxLPuLuieAn8Y_MCsuX1D_SP6u-WUFRFYqYjr09TKQLjsjYT68yDuEPKXv05XOtko9eZ3OMaycCm_LK4g3Ya5UbpAXO03M7-kzwpAbRABtJ7LwiPFxW5sH8aCi2cK9P50PwAMl994N8rxqFqUt9ae-ExUOa6NvHy_3sMSpY0qMo9oAoSt4NXHB5oosvaaDUEcodomZqjQ","e":"AQAB","d":"oW1ZWR_ZioLFqPQVFa7WtxwLrHE8aUHkgXMJ0YlYWaUPXNUvMLlBslMxB9Fl_NJyzQeHunB2XkzRNmQFQ7yiuleuZ_vqZW5IkGO2ifuV_Yomlha_GG8M2y-IUAj992aHDezLP2DQDTkoERd1A7YHBlUbh9_I4IdTmX8P7jSckdgQzRKwOoPCP2u9zPN49VLdiJz4MDq4coQrtlTXmBFQk0HMqaOhqtClLvZUD6w7-fQNg7qpDou2Ve_L9n832DggegbsAIVtYe4HD9U8k6Iod1-MYeW16RwSxuPhq-sTE9ob9boouYXtlqA7ro7ustjF1lnLXxNfw9kQrSI2ESCx-Q","p":"3OvUtaZExlCwTijDh3jD4tG77qf_tMwTB96o8-dqF7jy33PXp9uuyDxN1Y_1CHV1EUtwn-KM18BJK-i2y-VUToR798ddeuYhG86z6JxqlLMl-yIAmHKe3F4i75v83lRxIUbjMO7tPcBMpZEufkdMfMXacgGyrGgTR8OE5TELQys","q":"2wiNXW_SIwLzP9n9fq83_cMclE1Bs57ZgaPVhTwhBHyyW8P7gc2B6DOd3vJRbs3QnQNBzA2JWysjF_oSY7nIE90VvG_BXypg75RzB1L1jlcp8PbZU3alCXadUEnnKAQT7jrerKRfc1OgVZIvmeyOJklAqgia-I7tfxrIYnrSDSc","dp":"Z80jJ6qU-_1jqYW7wYZ7u7JCNDOZkRCmDHeROPDNx5GuBFIAzS0KZaj4BVVbk3rk45hntagT9zew6cGxSgJZ536WZOi2wo0ol1E69RuxdGbsfKAQWZDZlb9heOX5HVndwf31t8M7k10sZkrd5pWHmcS5DAJCOoG4NWrnoWy21vs","dq":"1Ydm2Ro0D7HGlg7b0-7ZdOgLKoCOdp97h6jCdZsCzS8Lae6LeCVyaX44f6pXvN-kag1MzbK8n0ZUdgFygAoThVnY4NVJ_I6B5c4gvZkgjl1nI-RiRb26cplSD32cfiRLkcmOX1v3OaTi_8j94t78TVLIWXr-KSadXXYst-Toda0","qi":"pTYf1OXAuROuGDYA4UxRzg4NafYV_5SHInRo-XyDq3A749DOrPBWPLvEMDlfUCaWSIKA6QU-TvZMSpLTNxQNJEHH0HuIr_M8pJj3_qSSKgGVHpyZvKt2McavDD0hhK3C_7jtrl7vY_8LhnGXWFwTizH3mdIpCcTTecEU7BAHYoE"}'

type KeyAndAlg = { key: KeyObject; alg: ALGORITHM }
function getPrivateKeys(): Promise<KeyAndAlg[]> {
  return startActiveSpan("getPrivateKeys", async () => {
    // In production, look for secrets
    if (process.env.NODE_ENV === "production") {
      const accessSecret = (await getSecret("jwt-access-secret", (secret) =>
        importPKCS8(secret, ALGORITHM.ES256)
      )) as KeyObject
      const idSecret = (await getSecret("jwt-id-secret", (secret) =>
        importPKCS8(secret, ALGORITHM.RS256)
      )) as KeyObject
      return [
        { key: accessSecret, alg: ALGORITHM.ES256 },
        { key: idSecret, alg: ALGORITHM.RS256 },
      ]
    } else {
      // In development, use the default key
      return [
        {
          key: (await importJWK(
            JSON.parse(DEFAULT_ACCESS_KEY),
            ALGORITHM.ES256
          )) as KeyObject,
          alg: ALGORITHM.ES256,
        },
        {
          key: (await importJWK(
            JSON.parse(DEFAULT_ID_KEY),
            ALGORITHM.RS256
          )) as KeyObject,
          alg: ALGORITHM.RS256,
        },
      ]
    }
  })
}

type Keypair = { priv: KeyObject; pub: KeyObject; alg: ALGORITHM }
function getKeypair(privateKey: KeyAndAlg): Keypair {
  return startActiveSpan("getKeypair", () => {
    const publicKey = createPublicKey(privateKey.key)
    return {
      priv: privateKey.key,
      pub: publicKey,
      alg: privateKey.alg,
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
  alg: ALGORITHM
}
async function generatePrivateAndJWK(
  privateKey: KeyAndAlg
): Promise<PrivateAndJWK> {
  return startActiveSpan("generatePrivateAndJWK", async () => {
    const keypair = getKeypair(privateKey)
    const jwk = await generateJWK(keypair.pub)
    return {
      priv: keypair.priv,
      jwk,
      alg: keypair.alg,
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

async function choosePrivateAndJWK(alg: ALGORITHM): Promise<PrivateAndJWK> {
  return startActiveSpan("choosePrivateAndJWK", async () => {
    const keys = await getPrivateAndJWKs()
    // Maybe choose at random
    return keys.filter((key) => key.alg === alg)[0]
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
  expirationTime?: string | number,
  alg?: ALGORITHM
): Promise<string>
export async function signJWT(
  payload: JWTPayload,
  audience: Audience,
  subject: Subject,
  expirationTime: string | number | undefined,
  alg: ALGORITHM,
  returnJTI: true
): Promise<[string, string]>
export async function signJWT(
  payload: JWTPayload,
  audience?: Audience,
  subject?: Subject,
  expirationTime?: string | number,
  alg = ALGORITHM.ES256,
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
    } = await choosePrivateAndJWK(alg)

    span.setAttributes({ jti, kid })

    let token = new SignJWT({ ...payload })
      .setProtectedHeader({ alg, typ: TYPE, kid })
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
      issuer: ISSUER,
      type: TYPE,
    })

    const jwks = await getJWKS()
    try {
      const { payload } = await jwtVerify(token, jwks, {
        audience,
        subject,
        algorithms: Object.values(ALGORITHM),
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

export const simpleParseJWT = <T>(token: string): T => {
  const [, payload] = token.split(".")
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"))
}
