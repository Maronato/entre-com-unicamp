import crypto from "crypto"

import { BaseIdenticon } from "."

function digestMessageHex(message: string) {
  const msgUint8 = new TextEncoder().encode(message) // encode as (utf-8) Uint8Array
  const hashBuffer = crypto.createHash("sha256").update(msgUint8).digest()
  const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("") // convert bytes to hex string
  return hashHex
}

export class SSRIdenticon extends BaseIdenticon<string> {
  constructor(message: string, size?: number) {
    super(digestMessageHex, message, size)
  }
}
