import { NextApiRequest, NextApiResponse } from "next"
import { CookieSerializeOptions, serialize } from "cookie"

export function setCookie(
  res: NextApiResponse,
  name: string,
  value: unknown,
  options: CookieSerializeOptions = {}
) {
  const stringValue =
    typeof value === 'object' ? 'j:' + JSON.stringify(value) : String(value)

  if ("maxAge" in options && options.maxAge) {
    options.expires = new Date(Date.now() + options.maxAge)
    options.maxAge /= 1000
  }

  res.setHeader('Set-Cookie', serialize(name, stringValue, options))
}

export function getCookie(req: NextApiRequest, name: string): string | undefined
export function getCookie(req: NextApiRequest, name: string, fallback: string): string
export function getCookie(req: NextApiRequest, name: string, fallback?: string) {
  return req.cookies[name] || fallback
}

export function removeCookie(res: NextApiResponse, name: string, options: CookieSerializeOptions = {}) {
  setCookie(res, name, "logout", { ...options, expires: new Date(), maxAge: 0 })
}
