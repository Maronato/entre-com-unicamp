import { getPrisma } from "@/prisma/db"
import { SSRIdenticon } from "@/utils/browser/identicon/ssr"
import { createClientID, createClientSecret } from "@/utils/common/random"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { REQUIRED_SCOPE, Scope } from "../scope"
import { getUser, serializeUser, User } from "../user"

import { App, AppType, SerializedApp } from "./types"

export function createApp(
  name: string,
  ownerID: User["id"],
  type: AppType,
  redirectURIs: string[],
  logo?: string,
  scope: Scope[] = REQUIRED_SCOPE
): Promise<App> {
  return startActiveSpan(
    "createApp",
    { attributes: { name, type, ownerID: ownerID } },
    async () => {
      const prisma = getPrisma()
      const client_id = createClientID()
      const client_secret = createClientSecret()
      if (!logo) {
        logo = new SSRIdenticon(name).render().toBase64()
      }

      const app = await prisma.app.create({
        data: {
          client_id,
          client_secret,
          name,
          logo,
          type,
          owner: ownerID,
          redirect_uris: redirectURIs,
          scope,
        },
      })
      return app
    }
  )
}

export function getFirstApp(): Promise<App | null> {
  return startActiveSpan("getFirstApp", async () => {
    const prisma = getPrisma()
    return prisma.app.findFirst()
  })
}

export function getApp(appID: App["id"]): Promise<App | null> {
  return startActiveSpan(
    "getApp",
    { attributes: { appID: appID } },
    async () => {
      const prisma = getPrisma()
      return prisma.app.findUnique({
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
      return prisma.app.findUnique({
        where: { client_id: clientID },
      })
    }
  )
}

export function getUserApps(owner: User["id"]) {
  return startActiveSpan(
    "getAppByClientID",
    { attributes: { owner: owner } },
    async () => {
      const prisma = getPrisma()
      return prisma.app.findMany({
        where: {
          owner,
        },
      })
    }
  )
}

export function updateApp(
  appID: App["id"],
  update: Partial<
    Pick<App, "name" | "redirect_uris" | "scope" | "type" | "logo">
  >
) {
  return startActiveSpan(
    "updateApp",
    { attributes: { appID: appID, ...update } },
    async () => {
      const prisma = getPrisma()
      if ("name" in update && update.name) {
        update.logo = new SSRIdenticon(update.name).render().toBase64()
      }

      return prisma.app.update({ data: { ...update }, where: { id: appID } })
    }
  )
}

export function deleteApp(appID: App["id"]) {
  return startActiveSpan(
    "deleteApp",
    { attributes: { appID: appID } },
    async () => {
      const prisma = getPrisma()
      return prisma.app.delete({ where: { id: appID } })
    }
  )
}

export function serializeApp<P extends boolean = false>(
  app: App,
  includePrivateInfo: P = false as P,
  owner?: User
): Promise<SerializedApp<P>> {
  return startActiveSpan(
    "serializeApp",
    { attributes: { app: app.id } },
    async () => {
      const keys: (keyof App)[] = ["name", "owner", "client_id", "logo"]

      if (includePrivateInfo) {
        keys.push("id", "type", "client_secret", "redirect_uris", "scope")
      }

      const result: Partial<SerializedApp<P>> = {}

      for (const key of keys) {
        let value: SerializedApp<true>[typeof key] = app[key]
        if (key === "owner") {
          let user = owner ?? null
          if (!user) {
            user = await getUser(app[key])
          }
          if (user) {
            value = serializeUser(
              user,
              includePrivateInfo
            ) as SerializedApp<true>["owner"]
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
        return getApp(app.id)
      }
      return getAppByClientID(app.client_id)
    }
  )
}
