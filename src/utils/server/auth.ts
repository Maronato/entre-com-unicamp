import { GetServerSideProps, NextApiRequest, NextApiResponse } from "next"

import { REQUIRED_SCOPE, Scope } from "@/oauth/scope"
import { validateToken } from "@/oauth/token"
import { createLoginToken } from "@/oauth/token/create"
import { TokenPayload } from "@/oauth/token/types"
import { serializeUser, unserializeUser, User } from "@/oauth/user"
import { key, UserFallback } from "@/utils/browser/hooks/useUser"

import { removeCookie, setCookie } from "./cookie"
import { ISSUER, verifyJWT } from "./jwt"
import { startActiveSpan } from "./telemetry/trace"

const AUTH_COOKIE_NAME = "jwt-auth"

const MAX_AGE = 60 * 60 * 24 * 30 * 12

const getAuthCookieOptions = () => ({
  maxAge: MAX_AGE,
  path: "/",
  sameSite: true,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
})

async function signAuthToken(user: User) {
  return createLoginToken(
    ISSUER,
    serializeUser(user, true),
    Object.values(Scope)
  )
}

async function verifyAuthToken(
  token: string,
  loginTokenOnly = true,
  scope = REQUIRED_SCOPE
): Promise<[User, Scope[]] | undefined> {
  return startActiveSpan("verifyAuthToken", async (span, setError) => {
    span.setAttribute("loginTokenOnly", loginTokenOnly)

    const result = await verifyJWT<TokenPayload>(token)

    if (
      !result ||
      !(await validateToken(result, {
        scope,
        type: loginTokenOnly ? "login_token" : undefined,
      }))
    ) {
      setError("Invalid token")
      return
    }

    const { sub, scope: tokenScope } = result
    const user = await unserializeUser({ id: sub || "" })
    if (user && scope.every((s) => tokenScope.includes(s))) {
      return [user, tokenScope] as [User, Scope[]]
    }
  })
}

function isAuthenticated(
  req: Pick<NextApiRequest, "cookies" | "headers">,
  checkAudience = true,
  scope = REQUIRED_SCOPE
): Promise<[User, Scope[]] | undefined> {
  return startActiveSpan("isAuthenticated", async (span) => {
    span.setAttribute("checkAudience", checkAudience)

    let token: string | undefined = (req.headers.authorization || "").split(
      "Bearer "
    )[1]
    if (!token) {
      token = req.cookies[AUTH_COOKIE_NAME]
    }

    return verifyAuthToken(token, checkAudience, scope)
  })
}

export async function login(res: NextApiResponse, user: User) {
  return startActiveSpan("login", async (span) => {
    span.setAttribute("user", user.id)

    const authToken = await signAuthToken(user)
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
  const auth = (await isAuthenticated(req)) || null
  return {
    [key]: auth ? serializeUser(auth[0], true) : auth,
  }
}

const authUserKey = "user"
const authScopeKey = "scope"
export type AuthenticatedAPIRequest = NextApiRequest & {
  [authUserKey]?: User
  [authScopeKey]?: Scope[]
}

export const hidrateAuthRequest = async (
  req: NextApiRequest,
  checkAudience?: boolean,
  scope?: Scope[]
): Promise<AuthenticatedAPIRequest> => {
  const auth = await isAuthenticated(req, checkAudience, scope)
  if (auth) {
    const authRequest: AuthenticatedAPIRequest = req

    const [user, scope] = auth
    authRequest[authUserKey] = user
    authRequest[authScopeKey] = scope

    return authRequest
  }
  throw new Error("Missing or invalid credentials")
}

export const getRequestUser = (req: AuthenticatedAPIRequest): User => {
  let user: User | undefined
  if (authUserKey in req && (user = req[authUserKey])) {
    return user
  }
  throw new Error(
    "useRequestUser must be used inside a handler called with withAuth"
  )
}
export const getRequestScope = (req: AuthenticatedAPIRequest): Scope[] => {
  let scope: Scope[] | undefined
  if (authScopeKey in req && (scope = req[authScopeKey])) {
    return scope
  }
  throw new Error(
    "useRequestScope must be used inside a handler called with withAuth"
  )
}
