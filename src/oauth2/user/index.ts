import { users } from "@prisma/client"

import { getPrisma } from "@/utils/db"
import { startActiveSpan } from "@/utils/telemetry/trace"

export type User = Pick<users, "id" | "email">
type SerializedPrivateUserInfo = {
  id: string
}
export type SerializedUser<Private extends boolean = false> =
  (Private extends true ? SerializedPrivateUserInfo : Record<string, never>) & {
    email: string
  }

export async function createUser(email: string): Promise<User> {
  return startActiveSpan("createUser", { attributes: { email } }, async () => {
    const prisma = getPrisma()

    const user = await prisma.users.create({
      data: { email },
    })
    return user
  })
}

export async function getFirstUser(): Promise<User | null> {
  return startActiveSpan("getFirstUser", async () => {
    const prisma = getPrisma()
    return prisma.users.findFirst()
  })
}

export async function getUser(userID: User["id"]): Promise<User | null> {
  return startActiveSpan(
    "getUser",
    { attributes: { userID: userID.toString() } },
    async () => {
      const prisma = getPrisma()
      return prisma.users.findUnique({
        where: { id: userID },
      })
    }
  )
}

export async function getUserByEmail(
  email: User["email"]
): Promise<User | null> {
  return startActiveSpan(
    "getUserByEmail",
    { attributes: { email } },
    async () => {
      const prisma = getPrisma()
      return prisma.users.findUnique({
        where: { email },
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
    { attributes: { user: user.id.toString() } },
    () => {
      const keys: (keyof User)[] = ["email"]

      if (includePrivateInfo) {
        keys.push("id")
      }

      return keys.reduce(
        (agg, key) => ({ ...agg, [key]: user[key].toString() }),
        {} as SerializedUser<P>
      )
    }
  )
}

export function unserializeUser<U extends SerializedUser>(
  user: U
): Promise<User | null> {
  return startActiveSpan(
    "unserializeUser",
    { attributes: { email: user.email } },
    async () => {
      return getUser(user.id)
    }
  )
}
