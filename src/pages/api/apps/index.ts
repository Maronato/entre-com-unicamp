import { createApp, getUserApps, serializeApp } from "@/oauth/app"
import { AppType, SerializedApp } from "@/oauth/app/types"
import { User } from "@/oauth/user"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import {
  respondCreated,
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
} from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

export type CreateRequestData = {
  name: string
  logo: string
  type: AppType
  redirect_uris: string[]
}

type CreateResponseData = SerializedApp<true>

async function createHandler(
  req: NextApiRequest,
  res: NextApiResponse<CreateResponseData | string>,
  user: User
) {
  const { name, redirect_uris, type, logo }: Partial<CreateRequestData> =
    req.body

  if (!name) {
    return respondInvalidRequest(res, "Missing name")
  }
  if (!redirect_uris) {
    return respondInvalidRequest(res, "Missing redirect_uris")
  }
  if (!type) {
    return respondInvalidRequest(res, "Missing type")
  }

  const app = await createApp(name, user.id, type, redirect_uris, logo)

  return respondCreated(res, serializeApp(app, true))
}

type ListResponseData = SerializedApp[]
async function listHandler(
  _req: NextApiRequest,
  res: NextApiResponse<ListResponseData | string>,
  user: User
) {
  const apps = await getUserApps(user.id)

  const resData = await Promise.all(
    apps
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .map((app) => serializeApp(app, false, user))
  )

  return respondOk(res, resData)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getRequestUser(req)

  switch (req.method) {
    case "POST":
      return createHandler(req, res, user)
    case "GET":
      return listHandler(req, res, user)
    default:
      return respondMethodNotAllowed(res)
  }
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler), true),
  ["GET", "POST"]
)
