import { CookieSerializeOptions, serialize } from "cookie"
import { NextApiResponse } from "next"

export function setCookie(
  res: NextApiResponse,
  name: string,
  value: unknown,
  options: CookieSerializeOptions = {}
) {
  const stringValue =
    typeof value === "object" ? "j:" + JSON.stringify(value) : String(value)

  if ("maxAge" in options && options.maxAge) {
    options.expires = new Date(Date.now() + options.maxAge * 1000)
  }

  res.setHeader("Set-Cookie", serialize(name, stringValue, options))
}

export function removeCookie(
  res: NextApiResponse,
  name: string,
  options: CookieSerializeOptions = {}
) {
  setCookie(res, name, "logout", { ...options, expires: new Date(), maxAge: 0 })
}
