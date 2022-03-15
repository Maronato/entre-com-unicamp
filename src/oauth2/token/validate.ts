import { getPrisma } from "@/utils/db"
import { verifyJWT } from "@/utils/jwt"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { User } from "../user"

import { isRevoked } from "./revoke"
import {
  AccessToken,
  AccessTokenPayload,
  RefreshTokenPayload,
  Token,
  TokenPayload,
  TokenType,
} from "./types"

export async function parseToken<
  T extends Token,
  R extends TokenPayload = T extends AccessToken
    ? AccessTokenPayload
    : RefreshTokenPayload
>(token: T) {
  const result = await verifyJWT<R>(token)
  return result
}

type ValidateData = {
  clientID?: string
  userID: User["id"]
  scope?: string[]
}

export async function verifyToken(
  token: Token,
  type: TokenType,
  validate?: ValidateData
): Promise<boolean>
export async function verifyToken(
  token: TokenPayload,
  type: TokenType,
  validate?: ValidateData
): Promise<boolean>
export async function verifyToken(
  token: Token | TokenPayload,
  type: TokenType,
  validate?: ValidateData
): Promise<boolean> {
  return startActiveSpan("verifyToken", async (span, setError) => {
    span.setAttributes({ type, validate: JSON.stringify(validate) })

    if (!token) {
      setError("Token type is falsy")
      return false
    }

    const parsed = typeof token === "string" ? await parseToken(token) : token
    if (!parsed) {
      setError("Failed to parse")
      return false
    }
    if (parsed.type !== type) {
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
    if (validate) {
      const res = await Promise.all([
        checkUserID(validate.userID)(BigInt(parsed.user.id)),
        checkClientID(validate.clientID)(parsed.aud),
        checkScope(validate.scope)(parsed.scope),
      ])
      const isValid = res.every((r) => !!r)
      if (!isValid) {
        setError(`Invalid batch check result: ${res}`)
        return false
      }
    }
    return true
  })
}

const checkUserID = (u1?: bigint) => async (u2: bigint) =>
  !u1 ||
  (u1 === u2 &&
    (await getPrisma().resource_owners.count({
      where: { id: u1 },
    })) === 1)

const checkClientID = (c1?: string) => async (c2: string) =>
  !c1 ||
  (c1 === c2 &&
    (await getPrisma().clients.count({ where: { client_id: c1 } })) === 1)

const checkScope = (s1?: string[]) => async (s2: string[]) =>
  !s1 || (s1.length === s2.length && s1.every((v, i) => v === s2[i]))
