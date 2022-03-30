import { enableTOTP, hasTOTP } from "@/oauth/user"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import { respondInvalidRequest, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type EnableRequest = {
  secret: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getRequestUser(req)
  const { secret }: Partial<EnableRequest> = req.body

  if (!secret) {
    return respondInvalidRequest(res, "Missing secret")
  }
  if (await hasTOTP(user)) {
    return respondInvalidRequest(res, "TOTP already enabled")
  }

  await enableTOTP(user.id, secret)

  return respondOk(res, "Enabled")
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler)),
  ["POST"]
)
