import { deleteApp, getAppByClientID, serializeApp } from "@/oauth/app"
import { User } from "@/oauth/user"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import {
  respondMethodNotAllowed,
  respondNoContent,
  respondNotFound,
  respondOk,
} from "@/utils/server/serverUtils"

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

  return respondOk(res, serializeApp(app, true, user))
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getRequestUser(req)

  switch (req.method) {
    case "GET":
      return getHandler(req, res, user)
    case "DELETE":
      return deleteHandler(req, res, user)
    default:
      return respondMethodNotAllowed(res)
  }
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler)),
  ["GET", "DELETE"]
)
