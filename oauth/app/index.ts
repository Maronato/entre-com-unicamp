import { getPrisma } from "@/prisma/db"
import { SSRIdenticon } from "@/utils/browser/identicon/ssr"
import { createClientID, createClientSecret } from "@/utils/common/random"
import {
  deleteCurrentAvatar,
  promoteTempAvatarToCurrent,
} from "@/utils/server/cdn/s3"
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

      let app = await prisma.app.create({
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

      if (logo) {
        const newLogo = await promoteTempAvatarToCurrent(app.id, logo)
        if (newLogo) {
          app = await prisma.app.update({
            where: { id: app.id },
            data: { logo: newLogo },
          })
        }
      }

      return app
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
  app: App,
  update: Partial<
    Pick<App, "name" | "redirect_uris" | "scope" | "type" | "logo">
  >
) {
  return startActiveSpan(
    "updateApp",
    { attributes: { appID: app.id, ...update } },
    async () => {
      const prisma = getPrisma()
      if (update.logo) {
        const newLogo = await promoteTempAvatarToCurrent(
          app.id,
          update.logo,
          app.logo
        )
        if (newLogo) {
          update.logo = newLogo
        }
      } else if ("name" in update && update.name) {
        update.logo = new SSRIdenticon(update.name).render().toBase64()
      }

      return prisma.app.update({ data: { ...update }, where: { id: app.id } })
    }
  )
}

export function deleteApp(app: App) {
  return startActiveSpan(
    "deleteApp",
    { attributes: { appID: app.id } },
    async () => {
      const prisma = getPrisma()
      await prisma.app.delete({ where: { id: app.id } })
      await deleteCurrentAvatar(app.logo)
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
