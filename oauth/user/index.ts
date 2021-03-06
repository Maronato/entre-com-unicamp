import { user } from "@prisma/client"

import { getPrisma } from "@/prisma/db"
import {
  deleteCurrentAvatar,
  promoteTempAvatarToCurrent,
} from "@/utils/server/cdn/s3"
import { generateIdenticon } from "@/utils/server/identicon"
import { getLogger } from "@/utils/server/telemetry/logs"
import { startActiveSpan } from "@/utils/server/telemetry/trace"
import { verifyTOTP } from "@/utils/server/totp"
import { fetchUnicampData, UnicampData } from "@/utils/server/unicamp"

import { App } from "../app/types"
import { revokeUserAppTokens } from "../token/revoke"

export type User = Pick<
  user,
  "id" | "email" | "picture" | "name" | "totp_secret" | "university_info"
>
type SerializedPrivateUserInfo = Record<string, never>
export type SerializedUser<Private extends boolean = false> =
  (Private extends true ? SerializedPrivateUserInfo : Record<string, never>) & {
    id: string
    email: string
    picture: string
    name: string | null
    university_info: UnicampData
  }

export async function createUser(
  email: string,
  name?: string,
  picture?: string
): Promise<User> {
  return startActiveSpan("createUser", { attributes: { email } }, async () => {
    const prisma = getPrisma()
    picture = picture ?? generateIdenticon(email.toLowerCase())

    const [hidratedName, unicampData] = await fetchUnicampData(email, name)

    const user = await prisma.user.create({
      data: {
        picture,
        email: email.toLowerCase(),
        name: hidratedName,
        university_info: unicampData,
      },
    })
    return user
  })
}

export async function updateUser(
  user: User,
  data: Partial<Pick<User, "name" | "picture">>
): Promise<User> {
  return startActiveSpan(
    "updateUser",
    { attributes: { userID: user.id, data: JSON.stringify(data) } },
    async () => {
      const prisma = getPrisma()

      if (data.picture) {
        const newAvatar = await promoteTempAvatarToCurrent(
          user.id,
          data.picture,
          user.picture
        )
        if (newAvatar) {
          data.picture = newAvatar
        }
      }

      const [hidratedName, unicampData] = await fetchUnicampData(
        user.email,
        data.name || user.name || undefined
      )

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: hidratedName,
          picture: data.picture,
          university_info: unicampData,
        },
      })
      return updatedUser
    }
  )
}

export async function getUser(userID: User["id"]): Promise<User | null> {
  return startActiveSpan("getUser", { attributes: { userID } }, async () => {
    const prisma = getPrisma()
    return prisma.user.findUnique({
      where: { id: userID },
    })
  })
}

export async function getUserByEmail(
  email: User["email"]
): Promise<User | null> {
  return startActiveSpan(
    "getUserByEmail",
    { attributes: { email } },
    async () => {
      const prisma = getPrisma()
      return prisma.user.findUnique({
        where: { email },
      })
    }
  )
}

export async function deleteUser(user: User) {
  return startActiveSpan(
    "deleteUser",
    { attributes: { userID: user.id } },
    async () => {
      const prisma = getPrisma()
      await prisma.user.delete({ where: { id: user.id } })
      await deleteCurrentAvatar(user.picture)
    }
  )
}

export async function deauthorizeApp(userID: User["id"], appID: App["id"]) {
  return startActiveSpan(
    "deauthorizeApp",
    { attributes: { user: userID, app: appID } },
    async () => {
      try {
        await revokeUserAppTokens(userID, appID)
      } catch (e) {
        const logger = getLogger()
        logger.error(e)
        return
      }
    }
  )
}

export async function userAuthorizedApp(
  userID: User["id"],
  clientID: App["client_id"]
) {
  return startActiveSpan(
    "userAuthorizedApp",
    { attributes: { user: userID, clientID } },
    async () => {
      const prisma = getPrisma()
      return (
        (await prisma.refresh_token.count({
          where: {
            AND: {
              app: {
                client_id: clientID,
              },
              user_id: userID,
            },
          },
        })) > 0
      )
    }
  )
}

export async function getAuthorizedApps(userID: User["id"]) {
  return startActiveSpan(
    "getAuthorizedApps",
    { attributes: { user: userID } },
    async () => {
      const prisma = getPrisma()
      return prisma.app.findMany({
        where: {
          refresh_token: {
            some: {
              user_id: userID,
            },
          },
        },
      })
    }
  )
}

export async function enableTOTP(userID: User["id"], secret: string) {
  return startActiveSpan(
    "enableTOTP",
    { attributes: { user: userID } },
    async () => {
      const prisma = getPrisma()
      return prisma.user.update({
        where: { id: userID },
        data: { totp_secret: secret },
      })
    }
  )
}

export async function disableTOTP(userID: User["id"]) {
  return startActiveSpan(
    "disableTOTP",
    { attributes: { user: userID } },
    async () => {
      const prisma = getPrisma()
      return prisma.user.update({
        where: { id: userID },
        data: { totp_secret: null },
      })
    }
  )
}

export async function hasTOTP(userID: User["id"]): Promise<boolean>
export async function hasTOTP(user: User): Promise<boolean>
export async function hasTOTP(user: User | User["id"]) {
  return startActiveSpan(
    "hasTOTP",
    { attributes: { user: typeof user === "string" ? user : user.id } },
    async () => {
      if (typeof user === "string") {
        const prisma = getPrisma()
        const found = await prisma.user.findUnique({ where: { id: user } })
        if (!found) {
          return false
        }
        user = found
      }
      return typeof user.totp_secret === "string"
    }
  )
}

export async function checkTOTP(
  userID: User["id"],
  code: string
): Promise<boolean>
export async function checkTOTP(user: User, code: string): Promise<boolean>
export async function checkTOTP(user: User | User["id"], code: string) {
  return startActiveSpan(
    "checkTOTP",
    { attributes: { user: typeof user === "string" ? user : user.id } },
    async () => {
      if (typeof user === "string") {
        const prisma = getPrisma()
        const found = await prisma.user.findUnique({ where: { id: user } })
        if (!found) {
          return false
        }
        user = found
      }
      if (typeof user.totp_secret !== "string") {
        return false
      }
      return verifyTOTP(user.totp_secret, code)
    }
  )
}

export function serializeUser<P extends boolean = false>(
  user: User,
  includePrivateInfo: P = false as P
): SerializedUser<P> {
  return startActiveSpan(
    "serializeUser",
    { attributes: { user: user.id } },
    () => {
      const keys: (keyof User)[] = [
        "email",
        "picture",
        "name",
        "id",
        "university_info",
      ]

      if (includePrivateInfo) {
        keys.push()
      }

      return keys.reduce(
        (agg, key) => ({ ...agg, [key]: user[key] }),
        {} as SerializedUser<P>
      )
    }
  )
}

export function unserializeUser<U extends SerializedUser>(
  user: Pick<U, "id">
): Promise<User | null> {
  return startActiveSpan(
    "unserializeUser",
    { attributes: { user: user.id } },
    async () => {
      return getUser(user.id)
    }
  )
}
