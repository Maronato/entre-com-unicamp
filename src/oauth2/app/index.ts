import { clients } from "@prisma/client"

import { startActiveSpan } from "@/utils/telemetry/trace"

import { getPrisma } from "../../utils/db"
import { createClientID, createClientSecret } from "../../utils/random"
import { getUser, SerializedUser, serializeUser, User } from "../user"

export enum AppType {
  PUBLIC = "public",
  CONFIDENTIAL = "confidential",
}

export type App = Pick<
  clients,
  | "client_id"
  | "client_secret"
  | "id"
  | "name"
  | "owner"
  | "redirect_uris"
  | "type"
>

type SerializedPrivateAppInfo = {
  client_secret: string
  redirect_uris: string
  id: string
  type: AppType
}
export type SerializedApp<Private extends boolean = false> =
  (Private extends true ? SerializedPrivateAppInfo : Record<string, never>) & {
    client_id: string
    name: string
    owner: SerializedUser<Private>
  }

export function createApp(
  name: string,
  ownerID: User["id"],
  type: AppType,
  redirectURIs: string[]
): Promise<App> {
  return startActiveSpan(
    "createApp",
    { attributes: { name, type, ownerID: ownerID.toString() } },
    async () => {
      const prisma = getPrisma()
      const client_id = createClientID()
      const client_secret = createClientSecret()

      const app = await prisma.clients.create({
        data: {
          client_id,
          client_secret,
          name,
          type,
          owner: ownerID,
          redirect_uris: redirectURIs,
        },
      })
      return app
    }
  )
}

export function getFirstApp(): Promise<App | null> {
  return startActiveSpan("getFirstApp", async () => {
    const prisma = getPrisma()
    return prisma.clients.findFirst()
  })
}

export function getApp(appID: App["id"]): Promise<App | null> {
  return startActiveSpan(
    "getApp",
    { attributes: { appID: appID.toString() } },
    async () => {
      const prisma = getPrisma()
      return prisma.clients.findUnique({
        where: { id: appID },
      })
    }
  )
}

export function getAppByClientID(
  clientID: App["client_id"]
): Promise<App | null> {
  return startActiveSpan(
    "getAppByClientID",
    { attributes: { clientID } },
    async () => {
      const prisma = getPrisma()
      return prisma.clients.findFirst({
        where: { client_id: clientID },
      })
    }
  )
}

export function getUserApps(owner: User["id"]) {
  return startActiveSpan(
    "getAppByClientID",
    { attributes: { owner: owner.toString() } },
    async () => {
      const prisma = getPrisma()
      return prisma.clients.findMany({
        where: {
          owner,
        },
      })
    }
  )
}

export function deleteApp(appID: App["id"]) {
  return startActiveSpan(
    "deleteApp",
    { attributes: { appID: appID.toString() } },
    async () => {
      const prisma = getPrisma()
      return prisma.clients.delete({ where: { id: appID } })
    }
  )
}

export function serializeApp<P extends boolean = false>(
  app: App,
  includePrivateInfo: P = false as P
): Promise<SerializedApp<P>> {
  return startActiveSpan(
    "serializeApp",
    { attributes: { app: app.id.toString() } },
    async () => {
      const keys: (keyof App)[] = ["name", "owner", "client_id"]

      if (includePrivateInfo) {
        keys.push("id", "type", "client_secret", "redirect_uris")
      }

      const result: Partial<SerializedApp<P>> = {}

      for (const key of keys) {
        let value: SerializedApp[typeof key] = app[key].toString()
        if (key === "owner") {
          const user = await getUser(app[key])
          if (user) {
            value = serializeUser(
              user,
              includePrivateInfo
            ) as SerializedApp["owner"]
          }
        }
        Object.assign(result, { [key]: value })
      }
      return result as SerializedApp<P>
    }
  )
}

export function unserializeApp(app: SerializedApp): Promise<App | null> {
  return startActiveSpan(
    "unserializeApp",
    { attributes: { app: app.client_id } },
    async () => {
      if ("id" in app) {
        return getApp(BigInt(app.id))
      }
      return getAppByClientID(app.client_id)
    }
  )
}