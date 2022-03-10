import { JWTPayload, jwtVerify, SignJWT } from "jose"
import { NextApiRequest, NextApiResponse } from "next"

import { ResourceOwner } from "../../oauth2/authorizationServer/resourceOwner"
import { removeCookie, setCookie } from "../cookie"
import { ALGORITHM, getJWKS, getPrivateKey } from "../jwk"

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

interface BaseTokenPayload {
  user: Pick<ResourceOwner, "email" | "id">
}
type TokenPayload = BaseTokenPayload &
  Required<Pick<JWTPayload, "iss" | "aud" | "iat" | "exp">>

async function signAuthToken(resourceOwner: ResourceOwner) {
  const payload: BaseTokenPayload = {
    user: { id: resourceOwner.id.toString(), email: resourceOwner.email },
  }
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(ISSUER)
    .setExpirationTime("1y")
    .sign(await getPrivateKey())
}

async function verifyAuthToken(token: string) {
  const jwks = await getJWKS()
  try {
    const result = await jwtVerify(token, jwks, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: ISSUER,
      typ: "JWT",
    })
    const { user } = result.payload as unknown as TokenPayload
    const resourceOwner = await ResourceOwner.get(user.id)
    if (resourceOwner) {
      return resourceOwner
    }
  } catch (e) {
    return
  }
}

export function isAuthenticated(
  req: Pick<NextApiRequest, "cookies" | "headers">
) {
  let token: string | undefined = (req.headers.authorization || "").split(
    "Bearer "
  )[1]
  if (!token) {
    token = req.cookies[AUTH_COOKIE_NAME]
  }
  return verifyAuthToken(token)
}

export async function login(
  res: NextApiResponse,
  resourceOwner: ResourceOwner
) {
  const authToken = await signAuthToken(resourceOwner)
  setCookie(res, AUTH_COOKIE_NAME, authToken, getAuthCookieOptions())
}

export function logout(res: NextApiResponse) {
  removeCookie(res, AUTH_COOKIE_NAME, getAuthCookieOptions())
}
