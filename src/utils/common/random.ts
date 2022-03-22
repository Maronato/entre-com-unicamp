import { randomBytes } from "crypto"

export function createRandomString(size = 24) {
  return randomBytes(size).toString("hex")
}

export function createClientID() {
  return createRandomString(18)
}

export function createClientSecret() {
  return createRandomString(24)
}
