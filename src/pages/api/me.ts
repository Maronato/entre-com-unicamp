import { ResourceOwner } from "@/oauth2/resourceOwner"
import { isAuthenticated } from "@/utils/auth/server"
import {
  respondMethodNotAllowed,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type ResponseData = ResourceOwner

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const auth = await isAuthenticated(req, false)
  if (!auth) {
    return respondUnauthorized(res, "Invalid credentials")
  }
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }
  const [user, scope] = auth

  if (scope.includes("id")) {
    return respondOk(res, user.toJSON(true) as ResourceOwner)
  }
  return respondOk(res, user.toJSON(false) as ResourceOwner)
}
