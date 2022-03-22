import { user } from "@prisma/client"

import { getPrisma } from "@/prisma/db"
import { generateIdenticon } from "@/utils/server/identicon"
import { getLogger } from "@/utils/server/telemetry/logs"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { App } from "../app/types"

export type User = Pick<user, "id" | "email" | "avatar" | "name">
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
