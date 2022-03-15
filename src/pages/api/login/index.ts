import {
  createUser,
  getUserByEmail,
  SerializedUser,
  serializeUser,
} from "@/oauth2/user"
import { login } from "@/utils/auth/server"
import { emailCodeIsValid } from "@/utils/emailCodes"
import { delay } from "@/utils/misc"
import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type RequestData = {
  code: string
  email: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ user: SerializedUser<true> }>
) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
  }
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
