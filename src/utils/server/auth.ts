import { GetServerSideProps, NextApiRequest, NextApiResponse } from "next"

import { Scope } from "@/oauth/scope"
import {
  SerializedUser,
  serializeUser,
  unserializeUser,
  User,
} from "@/oauth/user"
import { key, UserFallback } from "@/utils/browser/hooks/useUser"

import { removeCookie, setCookie } from "./cookie"
import { signJWT, verifyJWT } from "./jwt"
import { startActiveSpan } from "./telemetry/trace"

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
  user: SerializedUser<true>
  scope: Scope[]
}

async function signAuthToken(user: User) {
  const payload: TokenPayload = {
    user: serializeUser(user, true),
    scope: Object.values(Scope),
  }
  return signJWT({ ...payload }, ISSUER, "1y")
}

async function verifyAuthToken(
  token: string,
  checkAudience = true,
  scope = [Scope.EMAIL_READ]
): Promise<[User, Scope[]] | undefined> {
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

    const { user: serializedUser, scope: tokenScope } = result
    const user = await unserializeUser(
      serializedUser as unknown as SerializedUser<false>
    )
    if (user && scope.every((s) => tokenScope.includes(s))) {
      return [user, tokenScope] as [User, Scope[]]
    }
  })
}

export function isAuthenticated(
  req: Pick<NextApiRequest, "cookies" | "headers">,
  checkAudience = true,
  scope = [Scope.EMAIL_READ]
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
