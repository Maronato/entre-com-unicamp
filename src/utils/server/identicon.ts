import { SSRIdenticon } from "../browser/identicon/ssr"

export function generateIdenticon(message: string) {
  return new SSRIdenticon(message).render().toBase64()
}
