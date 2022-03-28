import { user } from "@prisma/client"

import { getPrisma } from "@/prisma/db"
import { generateIdenticon } from "@/utils/server/identicon"
import {
  deleteCurrentAvatar,
  promoteTempAvatarToCurrent,
} from "@/utils/server/s3"
import { getLogger } from "@/utils/server/telemetry/logs"
import { startActiveSpan } from "@/utils/server/telemetry/trace"
import { verifyTOTP } from "@/utils/server/totp"

import { App } from "../app/types"

export type User = Pick<
  user,
  "id" | "email" | "avatar" | "name" | "totp_secret"
>
type SerializedPrivateUserInfo = Record<string, never>
export type SerializedUser<Private extends boolean = false> =
  (Private extends true ? SerializedPrivateUserInfo : Record<string, never>) & {
    id: string
    email: string
    avatar: string
    name: string | null
  }

// Used to embed user info in tokens
export type SerializedUserLite = Pick<
  SerializedUser<false>,
  "email" | "id" | "name"
>

export async function createUser(
  email: string,
  name?: string,
  avatar?: string
): Promise<User> {
  return startActiveSpan("createUser", { attributes: { email } }, async () => {
    const prisma = getPrisma()
    avatar = avatar ?? generateIdenticon(email)
    const user = await prisma.user.create({
      data: { avatar, email, name },
    })
    return user
  })
}

export async function updateUser(
  user: User,
  data: Partial<Pick<User, "name" | "avatar">>
): Promise<User> {
  return startActiveSpan(
    "updateUser",
    { attributes: { userID: user.id, data: JSON.stringify(data) } },
    async () => {
      const prisma = getPrisma()

      if (data.avatar) {
        const newAvatar = await promoteTempAvatarToCurrent(
          user.id,
          data.avatar,
          user.avatar
        )
        if (newAvatar) {
          data.avatar = newAvatar
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { name: data.name, avatar: data.avatar },
      })
      return updatedUser
    }
  )
}

export async function getFirstUser(): Promise<User | null> {
  return startActiveSpan("getFirstUser", async () => {
    const prisma = getPrisma()
    return prisma.user.findFirst()
  })
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
      await deleteCurrentAvatar(user.avatar)
    }
  )
}

export async function authorizeApp(userID: User["id"], appID: App["id"]) {
  return startActiveSpan(
    "authorizeApp",
    { attributes: { user: userID, app: appID } },
    async () => {
      const prisma = getPrisma()
      return prisma.user.update({
        data: {
          authorized_apps: {
            connectOrCreate: {
              create: { app: { connect: { id: appID } } },
              where: {
                app_id_user_id: {
                  app_id: appID,
                  user_id: userID,
                },
              },
            },
          },
        },
        where: { id: userID },
      })
    }
  )
}

export async function deauthorizeApp(userID: User["id"], appID: App["id"]) {
  return startActiveSpan(
    "unauthorizeApp",
    { attributes: { user: userID, app: appID } },
    async () => {
      const prisma = getPrisma()
      try {
        await prisma.user_authorized_app.delete({
          where: { app_id_user_id: { app_id: appID, user_id: userID } },
        })
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
        (await prisma.app.count({
          where: {
            AND: {
              client_id: clientID,
              authorized_by: { some: { user_id: userID } },
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
          authorized_by: {
            some: {
              user: {
                id: userID,
              },
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
      const keys: (keyof User)[] = ["email", "avatar", "name", "id"]

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
