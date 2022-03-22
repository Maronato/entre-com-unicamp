import { Scope } from "@/oauth/scope"
import { SerializedUser, serializeUser } from "@/oauth/user"
import { getRequestUser, getRequestScope } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import { respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type ResponseData = SerializedUser

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const user = getRequestUser(req)
  const scope = getRequestScope(req)

  if (scope.includes(Scope.APPS_READ)) {
    return respondOk(res, serializeUser(user, true))
  }
  return respondOk(res, serializeUser(user))
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler), false)
)
