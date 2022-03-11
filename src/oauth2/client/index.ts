import { getPrisma } from "../../utils/db"
import { createRandomString } from "../../utils/random"
import { ResourceOwner } from "../resourceOwner"

export type ClientType = "confidential" | "public"

export class Client {
  id: string
  name: string
  owner: ResourceOwner
  type: ClientType
  clientId: string
  clientSecret: string
  redirectUris: string[]

  constructor(
    id: string,
    name: string,
    owner: ResourceOwner,
    type: ClientType,
    clientId: string,
    clientSecret: string,
    redirectUris: string[]
  ) {
    this.id = id
    this.name = name
    this.owner = owner
    this.type = type
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUris = redirectUris
  }

  redirectIsValid(redirectUri: string) {
    return this.redirectUris.includes(redirectUri)
  }

  toJSON(includePrivateInfo = false) {
    const keys: (keyof this)[] = ["name", "owner", "clientId"]

    if (includePrivateInfo) {
      keys.push("id", "type", "clientSecret", "redirectUris")
    }

    return keys.reduce((agg, key) => {
      const value =
        key !== "owner"
          ? this[key]
          : this[key as "owner"].toJSON(includePrivateInfo)
      return { ...agg, [key]: value }
    }, {} as Record<keyof this, this[keyof this]>)
  }

  static async get(id: string) {
    const prisma = getPrisma()
    const client = await prisma.clients.findUnique({
      where: { id: BigInt(id) },
    })
    if (client) {
      const owner = await ResourceOwner.get(client.owner.toString())
      if (owner) {
        return new Client(
          client.id.toString(),
          client.name,
          owner,
          client.type as ClientType,
          client.client_id,
          client.client_secret,
          client.redirect_uris
        )
      }
    }
  }

  static async getByClientID(clientId: string) {
    const prisma = getPrisma()
    const client = await prisma.clients.findFirst({
      where: { client_id: clientId },
    })
    if (client) {
      const owner = await ResourceOwner.get(client.owner.toString())
      if (owner) {
        return new Client(
          client.id.toString(),
          client.name,
          owner,
          client.type as ClientType,
          client.client_id,
          client.client_secret,
          client.redirect_uris
        )
      }
    }
  }

  static async create(
    name: string,
    owner: ResourceOwner,
    type: ClientType,
    redirectUris: string[]
  ) {
    const prisma = getPrisma()
    const clientId = createRandomString(24)
    const clientSecret = createRandomString(48)
    const client = await prisma.clients.create({
      data: {
        name,
        type,
        owner: BigInt(owner.id),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uris: redirectUris,
      },
    })
    return new Client(
      client.id.toString(),
      name,
      owner,
      type,
      client.client_id,
      client.client_secret,
      client.redirect_uris
    )
  }
}
