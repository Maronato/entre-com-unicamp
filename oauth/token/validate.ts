import { getPrisma } from "@/prisma/db"
import { ISSUER, verifyJWT } from "@/utils/server/jwt"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { Scope } from "../scope"
import { User, userAuthorizedApp } from "../user"

import { isRevoked } from "./revoke"
import {
  AccessToken,
  AccessTokenPayload,
  LoginTokenPayload,
  RefreshTokenPayload,
  Token,
  TokenPayload,
  TokenType,
} from "./types"

import { RefreshToken } from "."

export async function parseToken<
  T extends Token,
  R extends TokenPayload = T extends AccessToken
    ? AccessTokenPayload
    : T extends RefreshToken
    ? RefreshTokenPayload
    : LoginTokenPayload
>(token: T) {
  const result = await verifyJWT<R>(token)
  return result
}

type ValidateData = {
  clientID?: string
  userID?: User["id"]
  scope?: Scope[]
  type?: TokenType
}

export async function validateToken(
  token: Token,
  validate?: ValidateData
): Promise<boolean>
export async function validateToken(
  token: TokenPayload,
  validate?: ValidateData
): Promise<boolean>
export async function validateToken(
  token: Token | TokenPayload,
  validate: ValidateData = {}
): Promise<boolean> {
  return startActiveSpan("validateToken", async (span, setError) => {
    span.setAttributes({ validate: JSON.stringify(validate) })

    if (!token) {
      setError("Token type is falsy")
      return false
    }

    const parsed = typeof token === "string" ? await parseToken(token) : token
    if (!parsed) {
      setError("Failed to parse")
      return false
    }
    if (validate.type && validate.type !== parsed.type) {
      setError("Type mismatch")
      return false
    }
    if (parsed.type === "refresh_token") {
      // Check for revoked
      if (await isRevoked(parsed)) {
        setError("Refresh token has been revoked")
        return false
      }
    }

    if (parsed.type === "login_token" && parsed.aud !== ISSUER) {
      setError("Login token has wrong audience")
      return false
    }

    const validators = [
      checkUserID(validate.userID)(parsed.sub),
      checkScope(validate.scope)(parsed.scope),
    ]

    if (parsed.type !== "login_token") {
      validators.push(
        checkAuthorized(parsed.sub)(parsed.aud),
        checkClientID(validate.clientID)(parsed.aud)
      )
    }

    const res = await Promise.all(validators)
    const isValid = res.every((r) => !!r)
    if (!isValid) {
      setError(`Invalid batch check result: ${res}`)
      return false
    }

    return true
  })
}

const checkUserID = (u1?: string) => async (u2: string) =>
  !u1 ||
  (u1 === u2 &&
    (await getPrisma().user.count({
      where: { id: u1 },
    })) === 1)

const checkClientID = (c1?: string) => async (c2: string) =>
  !c1 ||
  (c1 === c2 &&
    (await getPrisma().app.count({ where: { client_id: c1 } })) === 1)

const checkScope = (s1?: Scope[]) => async (s2: Scope[]) =>
  !s1 || (s1.length <= s2.length && s1.every((v) => s2.includes(v)))

const checkAuthorized = (u?: string) => async (a?: string) =>
  !!u && !!a && (await userAuthorizedApp(u, a))
