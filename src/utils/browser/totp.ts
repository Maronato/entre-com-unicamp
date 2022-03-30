import { createRandomBytes } from "../common/random"
import {
  base32ToBuffer,
  bufferToBase32,
  verifyTOTPFactory,
} from "../common/totp"

async function computeHOTP(secret: string, counter: number) {
  // https://tools.ietf.org/html/rfc4226#section-5.1
  const formatCounter = (counter: number) => {
    const binStr = ("0".repeat(64) + counter.toString(2)).slice(-64)
    const intArr = []

    for (let i = 0; i < 8; i++) {
      intArr[i] = parseInt(binStr.slice(i * 8, i * 8 + 8), 2)
    }

    return Uint8Array.from(intArr).buffer
  }

  // https://tools.ietf.org/html/rfc4226#section-5.4
  const truncate = (buffer: Uint8Array) => {
    const offset = buffer[buffer.length - 1] & 0xf
    return (
      ((buffer[offset] & 0x7f) << 24) |
      ((buffer[offset + 1] & 0xff) << 16) |
      ((buffer[offset + 2] & 0xff) << 8) |
      (buffer[offset + 3] & 0xff)
    )
  }

  const key = await crypto.subtle.importKey(
    "raw",
    base32ToBuffer(secret),
    { name: "HMAC", hash: { name: "SHA-1" } },
    false,
    ["sign"]
  )
  const result = await crypto.subtle.sign("HMAC", key, formatCounter(counter))
  return ("000000" + (truncate(new Uint8Array(result)) % 10 ** 6)).slice(-6)
}

export const verifyTOTP = verifyTOTPFactory(computeHOTP)

export const generateSecret = () =>
  bufferToBase32(createRandomBytes(16)).slice(0, 16)

export const getSecretURL = (email: string, secret: string) =>
  `otpauth://totp/EntrecomUnicamp:${email}?secret=${secret}&issuer=EntrecomUnicamp&algorithm=SHA1&digits=6&period=30`
