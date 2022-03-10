import { randomBytes } from "crypto";

export function createRandomString(size: number = 24) {
  return randomBytes(size).toString("hex")
}
