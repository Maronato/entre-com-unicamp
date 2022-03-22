import { getAppByClientID, serializeApp } from "@/oauth/app"
import { SerializedApp } from "@/oauth/app/types"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { respondNotFound, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

async function findApp(req: NextApiRequest) {
  const { clientID } = req.query as { clientID: string }
  const app = await getAppByClientID(clientID)
  return app
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SerializedApp>
) {
  const app = await findApp(req)

  if (!app) {
    return respondNotFound(res, "App not found")
  }

  return respondOk(res, serializeApp(app))
}

export default withDefaultMiddleware(handleRequest(handler), ["GET"])
