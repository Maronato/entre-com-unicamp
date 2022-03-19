import {
  createUser,
  getUserByEmail,
  SerializedUser,
  serializeUser,
} from "@/oauth/user"
import { login } from "@/utils/server/auth"
import { emailCodeIsValid } from "@/utils/server/emailCodes"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { delay } from "@/utils/server/misc"
import {
  respondInvalidRequest,
  respondOk,
  respondUnauthorized,
} from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type RequestData = {
  code: string
  email: string
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ user: SerializedUser<true> }>
) {
  const { email, code }: Partial<RequestData> = req.body

  if (!email) {
    return respondInvalidRequest(res, "Missing email")
  }
  if (!code) {
    return respondInvalidRequest(res, "Missing code")
  }

  const isValid = await emailCodeIsValid(email, code)

  if (!isValid) {
    await delay(3000)
    return respondUnauthorized(res, "Invalid credentials")
  }

  let user = await getUserByEmail(email)
  if (!user) {
    user = await createUser(email)
  }
  await login(res, user)

  return respondOk(res, { user: serializeUser(user, true) })
}

export default withDefaultMiddleware(handleRequest(handler), ["POST"])
