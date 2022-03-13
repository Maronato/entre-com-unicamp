import { Client } from "@/oauth2/client"
import {
  respondMethodNotAllowed,
  respondNotFound,
  respondOk,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

async function getAppByClientId(req: NextApiRequest) {
  const { clientId } = req.query as { clientId: string }
  const app = await Client.getByClientID(clientId)
  return app
}

export interface ResponseData {
  name: string
  owner: {
    email: string
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }
  const app = await getAppByClientId(req)

  if (!app) {
    return respondNotFound(res, "App not found")
  }

  return respondOk(res, app.toJSON(false) as ResponseData)
}
