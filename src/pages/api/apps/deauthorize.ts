import { getAppByClientID } from "@/oauth/app"
import { SerializedApp } from "@/oauth/app/types"
import { deauthorizeApp } from "@/oauth/user"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import {
  respondInvalidRequest,
  respondNotFound,
  respondOk,
} from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

export type DeauthorizeRequest = {
  client_id: SerializedApp["client_id"]
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getRequestUser(req)

  const { client_id }: Partial<DeauthorizeRequest> = req.body

  if (!client_id) {
    return respondInvalidRequest(res, "Missing client_id")
  }

  const app = await getAppByClientID(client_id)

  if (!app) {
    return respondNotFound(res, "App not found")
  }

  await deauthorizeApp(user.id, app.id)

  return respondOk(res)
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler), true),
  ["POST"]
)
