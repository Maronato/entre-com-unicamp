import { GetServerSideProps, NextApiRequest, NextApiResponse } from "next"

import { ResourceOwner } from "@/oauth2/resourceOwner"

import { removeCookie, setCookie } from "../cookie"
import { key, UserFallback } from "../hooks/useUser"
import { signJWT, verifyJWT } from "../jwt"
import { startActiveSpan } from "../telemetry/trace"

const AUTH_COOKIE_NAME = "jwt-auth"

const ISSUER = "entre-com-unicamp.app"

const MAX_AGE = 60 * 60 * 24 * 30 * 12

export const getAuthCookieOptions = () => ({
  maxAge: MAX_AGE,
  path: "/",
  sameSite: true,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
})

type TokenPayload = {
  user: Pick<ResourceOwner, "email" | "id">
  scope: string[]
}

async function signAuthToken(resourceOwner: ResourceOwner) {
  const payload: TokenPayload = {
    user: { id: resourceOwner.id.toString(), email: resourceOwner.email },
    scope: ["email", "id"],
  }
  return signJWT({ ...payload }, ISSUER, "1y")
}

async function verifyAuthToken(token: string, checkAudience = true) {
  return startActiveSpan("verifyAuthToken", async (span, setError) => {
    span.setAttribute("checkAudience", checkAudience)

    const result = await verifyJWT<TokenPayload>(
      token,
      checkAudience ? ISSUER : undefined
    )
    if (!result) {
      setError("Invalid token")
      return
    }

    const { user, scope } = result
    const resourceOwner = await ResourceOwner.get(user.id)
    if (resourceOwner) {
      return [resourceOwner, scope] as [ResourceOwner, string[]]
    }
  })
}

export function isAuthenticated(
  req: Pick<NextApiRequest, "cookies" | "headers">,
  checkAudience = true
) {
  return startActiveSpan("isAuthenticated", async (span) => {
    span.setAttribute("checkAudience", checkAudience)

    let token: string | undefined = (req.headers.authorization || "").split(
      "Bearer "
    )[1]
    if (!token) {
      token = req.cookies[AUTH_COOKIE_NAME]
    }
    return verifyAuthToken(token, checkAudience)
  })
}

export async function login(
  res: NextApiResponse,
  resourceOwner: ResourceOwner
) {
  return startActiveSpan("login", async (span) => {
    span.setAttribute("resourceOwner", resourceOwner.id)

    const authToken = await signAuthToken(resourceOwner)
    setCookie(res, AUTH_COOKIE_NAME, authToken, getAuthCookieOptions())
  })
}

export function logout(res: NextApiResponse) {
  return startActiveSpan("logout", async () => {
    removeCookie(res, AUTH_COOKIE_NAME, getAuthCookieOptions())
  })
}

export const serverFetch = async (
  req: Parameters<GetServerSideProps>[0]["req"]
): Promise<UserFallback> => {
  const user = (await isAuthenticated(req)) || null
  return {
    [key]: user ? user[0].toJSON(true) : user,
  }
}
