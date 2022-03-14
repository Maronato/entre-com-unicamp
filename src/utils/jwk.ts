import { KeyObject, createPublicKey } from "crypto"

import { importJWK, createLocalJWKSet, exportJWK, JSONWebKeySet } from "jose"

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
