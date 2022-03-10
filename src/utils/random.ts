import { randomBytes } from "crypto"

export function createRandomString(size = 24) {
  return randomBytes(size).toString("hex")
}
