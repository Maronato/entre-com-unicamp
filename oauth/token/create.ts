import { getPrisma } from "@/prisma/db"
import { signJWT } from "@/utils/server/jwt"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { App } from "../app/types"
import { Scope } from "../scope"
import { User } from "../user"

import { revokePreviousRefreshToken } from "./revoke"
import {
  AccessToken,
  AccessTokenType,
  BaseTokenPayload,
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
        true
      )

      if (type === "refresh_token" && !jti) {
        await registerRefreshToken(user.id, clientID, signedJTI)
      }

      return signed
    })
  }

export const createAccessToken = createToken("access_token", "2h")

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
