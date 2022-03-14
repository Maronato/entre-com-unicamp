import { getPrisma } from "@/utils/db"
import { ExtendJWTPayload, signJWT, verifyJWT } from "@/utils/jwt"
import { getRedis } from "@/utils/redis"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { User } from "../resourceOwner"

export type AccessTokenType = "access_token"
export type RefreshTokenType = "refresh_token"
export type TokenType = AccessTokenType | RefreshTokenType
export type AccessToken = string
export type RefreshToken = string
export type Token = AccessToken | RefreshToken

type BaseTokenPayload = {
  user: Omit<User, "id"> & { id: string }
  type: TokenType
  scope: string[]
}

type BaseAccessTokenPayload = BaseTokenPayload & {
  type: AccessTokenType
  aud: string
}
type AccessTokenPayload = ExtendJWTPayload<BaseAccessTokenPayload>

type BaseRefreshTokenPayload = BaseTokenPayload & {
  type: RefreshTokenType
  aud: string
}
export type RefreshTokenPayload = ExtendJWTPayload<BaseRefreshTokenPayload>

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload

const REFRESH_TOKEN_JTI_SEPARATOR = ":"
type RefreshTokenJTI = {
  jti: string
  counter: number
}
/**
 * Parses refresh token JTIs for revocation
 *
 * @param previousJTI Previous token JTI
 * @returns the new token JTI
 */
const parseRefreshTokenCounter = (previousJTI: string): RefreshTokenJTI => {
  const [jti, countS] = previousJTI.split(REFRESH_TOKEN_JTI_SEPARATOR)
  const counter = parseInt(countS) || 1
  return { jti, counter }
}
const joinRefreshTokenCounter = (jti: RefreshTokenJTI): string => {
  return `${jti.jti}${REFRESH_TOKEN_JTI_SEPARATOR}${jti.counter}`
}
const getJTIRedisKey = (jti: string) => `refresh-token-revoke-${jti}`
const getLastJTISeen = async (jtiString: string) => {
  return startActiveSpan("getLastJTISeen", async (span) => {
    const redis = await getRedis()
    const { jti, counter } = parseRefreshTokenCounter(jtiString)
    const key = getJTIRedisKey(jti)
    const value = (await redis.get(key)) || "0"
    const currValue = Math.max(parseInt(value) || 0, counter)
    span.setAttributes({
      current_value: currValue,
      jti: jti,
      value,
      key,
    })
    return currValue
  })
}
const updateLastJTISeen = async (jtiString: string): Promise<string> => {
  return startActiveSpan("updateLastJTISeen", async (span) => {
    const redis = await getRedis()
    const { jti } = parseRefreshTokenCounter(jtiString)
    const lastSeen = await getLastJTISeen(jtiString)
    span.setAttributes({
      jti,
      lastSeen,
    })
    const key = getJTIRedisKey(jti)
    const counter = lastSeen + 1
    const newJTI = joinRefreshTokenCounter({ jti, counter })
    await redis.set(key, counter)
    return newJTI
  })
}

const createToken =
  <T extends TokenType>(type: T, expirationTime: string | false) =>
  async (
    clientID: string,
    user: User,
    scope: string[],
    jti?: string
  ): Promise<T extends AccessTokenType ? AccessToken : RefreshToken> => {
    return startActiveSpan(`createToken - ${type}`, async (span) => {
      span.setAttributes({
        type,
        expirationTime,
        clientID,
        user: JSON.stringify({ email: user.email, id: user.id.toString() }),
        scope,
      })

      const payload: BaseTokenPayload = {
        user: { email: user.email, id: user.id.toString() },
        type,
        scope,
      }
      return signJWT({ ...payload, jti }, clientID, expirationTime || undefined)
    })
  }

export const createAccessToken = createToken("access_token", "2h")

export const createRefreshToken = createToken("refresh_token", false)
export const rotateRefreshToken = async (
  previousJTI: string,
  ...args: Parameters<typeof createRefreshToken>
) => {
  return startActiveSpan("rotateRefreshToken", async (span) => {
    span.setAttribute("jti", previousJTI)
    // Increment JTI by one
    const jti = await updateLastJTISeen(previousJTI)
    return createRefreshToken(args[0], args[1], args[2], jti)
  })
}

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
    if (type === "refresh_token") {
      // Check for invalidated
      const currentCounter = await getLastJTISeen(parsed.jti)
      const { counter } = parseRefreshTokenCounter(parsed.jti)
      if (currentCounter > counter) {
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
