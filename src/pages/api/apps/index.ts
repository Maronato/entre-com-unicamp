import { Client, ClientType } from "@/oauth2/client"
import { ResourceOwner } from "@/oauth2/resourceOwner"
import { isAuthenticated } from "@/utils/auth/server"
import { getPrisma } from "@/utils/db"
import {
  respondCreated,
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type CreateRequestData = {
  name?: string
  type?: ClientType
  redirect_uris?: string[]
}

type CreateResponseData = Client

async function createHandler(
  req: NextApiRequest,
  res: NextApiResponse<CreateResponseData | string>,
  user: ResourceOwner
) {
  const { name, redirect_uris, type }: CreateRequestData = req.body

  if (!name) {
    return respondInvalidRequest(res, "Missing name")
  }
  if (!redirect_uris) {
    return respondInvalidRequest(res, "Missing redirect_uris")
  }
  if (!type) {
    return respondInvalidRequest(res, "Missing type")
  }

  const client = await Client.create(name, user, type, redirect_uris)

  return respondCreated(res, client.toJSON(true) as Client)
}

type ListResponseData = Pick<Client, "clientId" | "id" | "name" | "type">[]
async function listHandler(
  _req: NextApiRequest,
  res: NextApiResponse<ListResponseData | string>,
  user: ResourceOwner
) {
  const prisma = getPrisma()
  const apps = await prisma.clients.findMany({
    where: { owner: BigInt(user.id) },
  })

  const resData: ListResponseData = apps.map((app) => ({
    clientId: app.client_id,
    id: app.id.toString(),
    name: app.name,
    type: app.type as ClientType,
  }))

  return respondOk(res, resData)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await isAuthenticated(req)
  if (!auth) {
    return respondUnauthorized(res, "Invalid credentials")
  }

  const [user] = auth

  switch (req.method) {
    case "POST":
      return createHandler(req, res, user)
    case "GET":
      return listHandler(req, res, user)
    default:
      return respondMethodNotAllowed(res)
  }
}
