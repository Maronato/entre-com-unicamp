import {
  AppType,
  createApp,
  getUserApps,
  serializeApp,
  SerializedApp,
} from "@/oauth2/app"
import { User } from "@/oauth2/user"
import { isAuthenticated } from "@/utils/auth/server"
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
  type?: AppType
  redirect_uris?: string[]
}

type CreateResponseData = SerializedApp<true>

async function createHandler(
  req: NextApiRequest,
  res: NextApiResponse<CreateResponseData | string>,
  user: User
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

  const app = await createApp(name, user.id, type, redirect_uris)

  return respondCreated(res, serializeApp(app, true))
}

type ListResponseData = SerializedApp[]
async function listHandler(
  _req: NextApiRequest,
  res: NextApiResponse<ListResponseData | string>,
  user: User
) {
  const apps = await getUserApps(user.id)

  const resData = await Promise.all(apps.map((app) => serializeApp(app)))

  return respondOk(res, resData)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await isAuthenticated(req)
  if (!user) {
    return respondUnauthorized(res, "Invalid credentials")
  }

  switch (req.method) {
    case "POST":
      return createHandler(req, res, user)
    case "GET":
      return listHandler(req, res, user)
    default:
      return respondMethodNotAllowed(res)
  }
}
