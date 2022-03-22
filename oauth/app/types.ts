import type { Scope } from "../scope"
import type { SerializedUser } from "../user"
import type { app } from "@prisma/client"

export enum AppType {
  PUBLIC = "public",
  CONFIDENTIAL = "confidential",
}

export type App = Pick<
  app,
  | "client_id"
  | "client_secret"
  | "id"
  | "name"
  | "logo"
  | "owner"
  | "redirect_uris"
  | "type"
  | "scope"
>

type SerializedPrivateAppInfo = {
  client_secret: string
  redirect_uris: string[]
  id: string
  type: AppType
  scope: Scope[]
}
export type SerializedApp<Private extends boolean = false> =
  (Private extends true ? SerializedPrivateAppInfo : Record<string, never>) & {
    client_id: string
    name: string
    logo: string
    owner: SerializedUser<Private>
  }
