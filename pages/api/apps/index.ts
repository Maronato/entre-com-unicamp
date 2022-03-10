import { Client, ClientType } from "../../../oauth2/authorizationServer/client"
import { ResourceOwner } from "../../../oauth2/authorizationServer/resourceOwner"
import { isAuthenticated } from "../../../utils/auth/server"
import { getPrisma } from "../../../utils/db"

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
    return res.status(401).send("Missing name")
  }
  if (!redirect_uris) {
    return res.status(401).send("Missing redirect_uris")
  }
  if (!type) {
    return res.status(401).send("Missing type")
  }

  const client = await Client.create(name, user, type, redirect_uris)

  return res.status(201).json(client)
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

  return res.status(200).json(resData)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await isAuthenticated(req)
  if (!user) {
    return res.status(401).send("Must be authenticated")
  }

  switch (req.method) {
    case "POST":
      return createHandler(req, res, user)
    case "GET":
      return listHandler(req, res, user)
    default:
      return res.status(405).send("Method not allowed")
  }
}
