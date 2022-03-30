import { checkTOTP, getUserByEmail, serializeUser } from "@/oauth/user"
import { login } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { delay } from "@/utils/server/misc"
import { respondInvalidRequest, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type VerifyTOTPRequest = {
  email: string
  code: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, email }: Partial<VerifyTOTPRequest> = req.body

  if (!email) {
    return respondInvalidRequest(res, "Missing email")
  }
  if (!code) {
    return respondInvalidRequest(res, "Missing code")
  }

  const user = await getUserByEmail(email)

  if (!user) {
    return respondInvalidRequest(res, "User not found")
  }

  const check = await checkTOTP(user, code)

  if (!check) {
    await delay(1000)
    return respondInvalidRequest(res, "Invalid code")
  }

  await login(res, user)

  return respondOk(res, { user: serializeUser(user, true) })
}

export default withDefaultMiddleware(handleRequest(handler), ["POST"])
