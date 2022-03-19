import { getAppByClientID, serializeApp, SerializedApp } from "@/oauth/app"
import {
  respondMethodNotAllowed,
  respondNotFound,
  respondOk,
} from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

async function findApp(req: NextApiRequest) {
  const { clientID } = req.query as { clientID: string }
  const app = await getAppByClientID(clientID)
  return app
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SerializedApp>
) {
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }
  const app = await findApp(req)

  if (!app) {
    return respondNotFound(res, "App not found")
  }

  return respondOk(res, serializeApp(app))
}
