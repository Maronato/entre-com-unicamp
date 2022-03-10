import { Client } from "../../../oauth2/authorizationServer/client"
import { ResourceOwner } from "../../../oauth2/authorizationServer/resourceOwner"
import { isAuthenticated } from "../../../utils/auth/server"
import { getPrisma } from "../../../utils/db"

import type { NextApiRequest, NextApiResponse } from "next"

async function getUserApp(req: NextApiRequest, user: ResourceOwner) {
  const { appId } = req.query as { appId: string }
  const app = await Client.get(appId)

  if (app && app.owner.id === user.id) {
    return app
  }
}

async function getHandler(
  req: NextApiRequest,
  res: NextApiResponse<Client | string>,
  user: ResourceOwner
) {
  const app = await getUserApp(req, user)

  if (!app) {
    return res.status(404).send("App not found")
  }

  return res.status(200).json(app)
}

async function deleteHandler(
  req: NextApiRequest,
  res: NextApiResponse<string>,
  user: ResourceOwner
) {
  const app = await getUserApp(req, user)
  if (!app) {
    return res.status(404).send("App not found")
  }
  const prisma = getPrisma()
  await prisma.clients.delete({ where: { id: BigInt(app.id) } })

  return res.status(204).json("Success")
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
    case "GET":
      return getHandler(req, res, user)
    case "DELETE":
      return deleteHandler(req, res, user)
    default:
      return res.status(405).send("Method not allowed")
  }
}
