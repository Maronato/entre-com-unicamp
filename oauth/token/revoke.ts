import { getPrisma } from "@/prisma/db"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { RefreshTokenPayload } from "./types"

const REFRESH_TOKEN_JTI_SEPARATOR = ":"
type RefreshTokenJTI = {
  jti: string
  counter: number
}

const getCurrentCounter = async (jti: string) => {
  const primsa = getPrisma()
  return startActiveSpan(
    "getCurrentCounter",
    { attributes: { jti } },
    async () => {
      const token = await primsa.refresh_token.findUnique({
        where: { jti },
      })
      return token ? token.counter : Infinity
    }
  )
}
const updateCounter = async (jti: string, counter: number) => {
  const primsa = getPrisma()
  return startActiveSpan(
    "updateCounter",
    { attributes: { jti, counter } },
    async () => {
      await primsa.refresh_token.update({
        where: { jti },
        data: {
          counter,
        },
      })
    }
  )
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

const getLastJTISeen = async (jtiString: string) => {
  return startActiveSpan("getLastJTISeen", async (span) => {
    const { jti } = parseRefreshTokenCounter(jtiString)
    const counter = await getCurrentCounter(jti)

    span.setAttributes({
      counter,
      jti: jti,
    })
    return counter
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
    const { jti } = parseRefreshTokenCounter(previousJTI)
    const lastSeen = await getLastJTISeen(jti)
    span.setAttributes({
      jti,
      lastSeen,
    })
    const counter = lastSeen + 1
    await updateCounter(jti, counter)
    return joinRefreshTokenCounter({ jti, counter })
  })
}

/**
 * Check if a refresh token has been revoked
 *
 * @param refreshToken The refresh token to check
 * @returns Wether the token has been revoked
 */
export const isRevoked = async (refreshToken: RefreshTokenPayload) => {
  return startActiveSpan("isRevoked", async (span) => {
    const currentCounter = await getLastJTISeen(refreshToken.jti)
    const { counter } = parseRefreshTokenCounter(refreshToken.jti)

    span.setAttributes({
      currentCounter,
      counter,
    })
    return currentCounter > counter
  })
}

export const revokeUserAppTokens = async (userID: string, appID: string) => {
  return startActiveSpan(
    "revokeUserAppTokens",
    { attributes: { userID, appID } },
    async () => {
      const prisma = getPrisma()
      return prisma.refresh_token.deleteMany({
        where: {
          AND: {
            app_id: appID,
            user_id: userID,
          },
        },
      })
    }
  )
}
