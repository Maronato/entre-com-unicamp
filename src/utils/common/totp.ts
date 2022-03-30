// https://www.laroberto.com/totp-primer/

const TIME_STEP = 30 * 1000

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function base32ToBuffer(base32: string): ArrayBuffer {
  const cleanedInput = base32.toUpperCase().replace(/=+$/, "")
  const { length } = cleanedInput

  let bits = 0
  let value = 0

  let index = 0
  const output = new Uint8Array(((length * 5) / 8) | 0)

  for (let i = 0; i < length; i++) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(cleanedInput[i])
    bits += 5

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }

  return output.buffer
}

export function bufferToBase32(arrBuff: ArrayBuffer) {
  const buff = new Uint8Array(arrBuff)
  // https://github.com/emn178/hi-base32/blob/master/src/base32.js
  let base32Str = ""

  for (let i = 0; i < buff.length; ) {
    const v1 = buff[i++]
    const v2 = buff[i++]
    const v3 = buff[i++]
    const v4 = buff[i++]
    const v5 = buff[i++]
    base32Str +=
      BASE32_ALPHABET[v1 >>> 3] +
      BASE32_ALPHABET[((v1 << 2) | (v2 >>> 6)) & 31] +
      BASE32_ALPHABET[(v2 >>> 1) & 31] +
      BASE32_ALPHABET[((v2 << 4) | (v3 >>> 4)) & 31] +
      BASE32_ALPHABET[((v3 << 1) | (v4 >>> 7)) & 31] +
      BASE32_ALPHABET[(v4 >>> 2) & 31] +
      BASE32_ALPHABET[((v4 << 3) | (v5 >>> 5)) & 31] +
      BASE32_ALPHABET[v5 & 31]
  }

  return base32Str
}

function getCurrentStep() {
  const now = new Date().getTime()
  return now / TIME_STEP
}

type ComputeHOTP = (secret: string, counter: number) => Promise<string>

export const verifyTOTPFactory =
  (computeHOTP: ComputeHOTP) => async (secret: string, code: string) => {
    const counter = Math.floor(getCurrentStep())
    let verifier = await computeHOTP(secret, counter)
    if (verifier !== code) {
      verifier = await computeHOTP(secret, counter - 1)
    }
    if (verifier !== code) {
      verifier = await computeHOTP(secret, counter + 1)
    }
    return verifier === code
  }
