import { deleteApp, getAppByClientID, serializeApp } from "@/oauth2/app"
import { User } from "@/oauth2/user"
import { isAuthenticated } from "@/utils/auth/server"
import {
  respondMethodNotAllowed,
  respondNoContent,
  respondNotFound,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

async function getUserApp(req: NextApiRequest, user: User) {
  const { clientID } = req.query as { clientID: string }
  const app = await getAppByClientID(clientID)

  if (app && app.owner === user.id) {
    return app
  }
}

async function getHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  const app = await getUserApp(req, user)

  if (!app) {
    return respondNotFound(res, "App not found")
  }

  return respondOk(res, serializeApp(app, true))
}

async function deleteHandler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: User
) {
  const app = await getUserApp(req, user)
  if (!app) {
    return respondNotFound(res, "App not found")
  }
  await deleteApp(app.id)

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