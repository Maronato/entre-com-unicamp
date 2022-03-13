import { Client } from "@/oauth2/client"
import { ResourceOwner } from "@/oauth2/resourceOwner"
import { isAuthenticated } from "@/utils/auth/server"
import { getPrisma } from "@/utils/db"
import {
  respondMethodNotAllowed,
  respondNoContent,
  respondNotFound,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

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
  res: NextApiResponse,
  user: ResourceOwner
) {
  const app = await getUserApp(req, user)

  if (!app) {
    return respondNotFound(res, "App not found")
  }

  return respondOk(res, app.toJSON(true))
}

async function deleteHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: ResourceOwner
) {
  const app = await getUserApp(req, user)
  if (!app) {
    return respondNotFound(res, "App not found")
  }
  const prisma = getPrisma()
  await prisma.clients.delete({ where: { id: BigInt(app.id) } })

  return respondNoContent(res)
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
    case "GET":
      return getHandler(req, res, user)
    case "DELETE":
      return deleteHandler(req, res, user)
    default:
      return respondMethodNotAllowed(res)
  }
}
