import { BaseIdenticon } from "."

export async function digestMessageHex(message: string) {
  const msgUint8 = new TextEncoder().encode(message) // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8) // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)) // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("") // convert bytes to hex string
  return hashHex
}

export class BrowserIdenticon extends BaseIdenticon<Promise<string>> {
  constructor(message: string, size?: number) {
    super(digestMessageHex, message, size)
  }
}
