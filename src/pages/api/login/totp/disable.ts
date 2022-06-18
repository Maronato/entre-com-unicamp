import { checkTOTP, disableTOTP, hasTOTP } from "@/oauth/user"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import { delay } from "@/utils/server/misc"
import { respondInvalidRequest, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type DisableRequest = {
  code: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getRequestUser(req)
  const { code }: Partial<DisableRequest> = req.body

  if (!code) {
    return respondInvalidRequest(res, "Missing code")
  }
  if (!(await hasTOTP(user))) {
    return respondInvalidRequest(res, "TOTP is not enabled")
  }

  const check = await checkTOTP(user, code)
  if (!check) {
    await delay(1000)
    return respondInvalidRequest(res, "Invalid code")
  }

  await disableTOTP(user.id)

  return respondOk(res, "Disabled")
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler), true),
  ["POST"]
)
