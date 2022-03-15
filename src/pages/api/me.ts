import { Scope } from "@/oauth2/scope"
import { SerializedUser, serializeUser } from "@/oauth2/user"
import { isAuthenticated } from "@/utils/auth/server"
import {
  respondMethodNotAllowed,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type ResponseData = SerializedUser

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const user = await isAuthenticated(req, false)
  const withID = await isAuthenticated(req, false, [Scope.ID_READ])

  if (!user) {
    return respondUnauthorized(res, "Invalid credentials")
  }
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }

  if (withID) {
    return respondOk(res, serializeUser(user, true))
  }
  return respondOk(res, serializeUser(user))
}
