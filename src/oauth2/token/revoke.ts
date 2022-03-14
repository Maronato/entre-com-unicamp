import { getRedis } from "@/utils/redis"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { RefreshTokenPayload } from "./types"

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
export const getLastJTISeen = async (jtiString: string) => {
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
/**
 * Rotates the JTI counter, revoking the old token if need be
 *
 * @param jtiString Last token JTI
 * @returns A new token JTI
 */
export const revokePreviousRefreshToken = async (
  previousJTI: string
): Promise<string> => {
  return startActiveSpan("updateLastJTISeen", async (span) => {
    const redis = await getRedis()
    const { jti } = parseRefreshTokenCounter(previousJTI)
    const lastSeen = await getLastJTISeen(previousJTI)
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

/**
 * Check if a refresh token has been revoked
 *
 * @param refreshToken The refresh token to check
 * @returns Wether the token has been revoked
 */
export const isRevoked = async (refreshToken: RefreshTokenPayload) => {
  const currentCounter = await getLastJTISeen(refreshToken.jti)
  const { counter } = parseRefreshTokenCounter(refreshToken.jti)
  return currentCounter > counter
}
