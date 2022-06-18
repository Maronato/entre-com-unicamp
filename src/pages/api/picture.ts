import { createRandomString } from "@/utils/common/random"
import { getRequestUser } from "@/utils/server/auth"
import { getTempAvatarURL } from "@/utils/server/cdn/picture"
import { getAvatarUploadSignedURL } from "@/utils/server/cdn/s3"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
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
  uploadURL: string
  cdnURL: string
}

const handlePOST: NextApiHandler = async (req, res) => {
  const user = getRequestUser(req)

  const { operation } = req.body as Partial<RequestData>

  const id = user.id

  if (!operation) {
    return respondInvalidRequest(res, "missing operation")
  }

  const nonce = createRandomString(10)
  const uploadURL = await getAvatarUploadSignedURL(id, nonce)

  const response: ResponseData = {
    uploadURL,
    cdnURL: getTempAvatarURL(id, nonce),
  }

  return respondOk(res, response)
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
  withAuthMiddleware(handleRequest(handler), true),
  ["POST"]
)
