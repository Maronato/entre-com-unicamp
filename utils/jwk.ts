import { KeyObject, createPublicKey } from "crypto"

import { importJWK, createLocalJWKSet, exportJWK, JSONWebKeySet } from "jose"

export const ALGORITHM = "ES256"

export function getPrivateKey(): Promise<KeyObject> {
  return importJWK(
    JSON.parse(process.env.JWT_PRIVATE_KEY || ""),
    ALGORITHM
  ) as Promise<KeyObject>
}

async function getPublicKey() {
  return createPublicKey(await getPrivateKey())
}

export async function getJSONWebKeySet(): Promise<JSONWebKeySet> {
  return { keys: [await exportJWK(await getPublicKey())] }
}

export async function getJWKS() {
  return createLocalJWKSet(await getJSONWebKeySet())
}
