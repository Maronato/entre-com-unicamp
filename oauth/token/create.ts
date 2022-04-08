import { getPrisma } from "@/prisma/db"
import { ALGORITHM, signJWT } from "@/utils/server/jwt"
import { getRedis } from "@/utils/server/redis"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { App } from "../app/types"
import { Scope } from "../scope"
import { getUser, serializeUser, User } from "../user"

import { revokePreviousRefreshToken } from "./revoke"
import {
  AccessToken,
  AccessTokenType,
  BaseTokenPayload,
  IDTokenPayload,
  RefreshToken,
  TokenType,
} from "./types"

const registerRefreshToken = async (
  userID: User["id"],
  clientID: App["client_id"],
  jti: string
) => {
  const prisma = getPrisma()
  return startActiveSpan(
    "registerRefreshToken",
    { attributes: { userID, jti } },
    async () => {
      await prisma.refresh_token.create({
        data: {
          jti: jti,
          counter: 1,
          user: {
            connect: { id: userID },
          },
          app: {
            connect: { client_id: clientID },
          },
        },
      })
    }
  )
}

const createToken =
  <T extends TokenType>(type: T, expirationTime: string | false) =>
  async (
    clientID: string,
    user: Pick<User, "id">,
    scope: Scope[],
    jti?: string
  ): Promise<T extends AccessTokenType ? AccessToken : RefreshToken> => {
    return startActiveSpan(`createToken - ${type}`, async (span) => {
      span.setAttributes({
        type,
        expirationTime,
        clientID,
        user: user.id,
        scope,
      })

      const payload: BaseTokenPayload = {
        type,
        scope,
      }
      const [signed, signedJTI] = await signJWT(
        { ...payload, jti },
        clientID,
        user.id,
        expirationTime || undefined,
        ALGORITHM.ES256,
        true
      )

      if (type === "refresh_token" && !jti) {
        await registerRefreshToken(user.id, clientID, signedJTI)
      }

      return signed
    })
  }

const ACCESS_TOKEN_EXPIRATION_TIME = "1h"

export const createAccessToken = createToken(
  "access_token",
  ACCESS_TOKEN_EXPIRATION_TIME
)

export const createLoginToken = createToken("login_token", "1y")

export const createRefreshToken = createToken("refresh_token", false)

export const rotateRefreshToken = async (
  previousJTI: string,
  ...args: Parameters<typeof createRefreshToken>
) => {
  return startActiveSpan("rotateRefreshToken", async (span) => {
    span.setAttribute("jti", previousJTI)

    // New refresh token JTI
    const jti = await revokePreviousRefreshToken(previousJTI)
    return createRefreshToken(args[0], args[1], args[2], jti)
  })
}

const nonceRedisKey = (clientID: App["client_id"]) => `nonce:${clientID}`
export const cacheIDNonce = async (
  clientID: App["client_id"],
  nonce: string
) => {
  const redis = await getRedis()
  await redis.set(nonceRedisKey(clientID), nonce, 60 * 10)
}
const getIDNonce = async (clientID: App["client_id"]) => {
  const redis = await getRedis()
  return redis.getdel(nonceRedisKey(clientID))
}

export const createIDToken = async (
  clientID: App["client_id"],
  user: Pick<User, "id">,
  scope: Scope[]
): Promise<string | undefined> => {
  if (!scope.includes(Scope.OPENID)) {
    return undefined
  }
  const userData = await getUser(user.id)
  if (!userData) {
    return undefined
  }
  const serialized = serializeUser(userData)
  const payload: Omit<IDTokenPayload, "aud" | "sub"> = {
    email: serialized.email,
    name: serialized.name || "",
    picture: serialized.picture,
    university_info: serialized.university_info,
    type: "id_token",
    scope,
  }
  const nonce = await getIDNonce(clientID)
  if (nonce) {
    payload.nonce = nonce
  }

  return await signJWT(
    { ...payload },
    clientID,
    serialized.id,
    ACCESS_TOKEN_EXPIRATION_TIME,
    ALGORITHM.RS256
  )
}
