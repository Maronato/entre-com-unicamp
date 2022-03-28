import { createRandomString } from "@/utils/common/random"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import { getAvatarUploadSignedURL } from "@/utils/server/s3"
import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
} from "@/utils/server/serverUtils"

import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next"

export type RequestData = {
  operation: "getUploadURL"
}
export type ResponseData = {
  url: string
  nonce: string
}

const handlePOST: NextApiHandler = async (req, res) => {
  const user = getRequestUser(req)

  const { operation } = req.body as Partial<RequestData>

  if (!operation) {
    return respondInvalidRequest(res, "missing operation")
  }

  const nonce = createRandomString(10)
  const url = await getAvatarUploadSignedURL(user.id, nonce)

  return respondOk(res, { url, nonce })
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "POST":
      return handlePOST(req, res)
    default:
      return respondMethodNotAllowed(res)
  }
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler)),
  ["POST"]
)
