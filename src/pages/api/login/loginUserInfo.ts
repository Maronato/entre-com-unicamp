import { getUserByEmail, hasTOTP } from "@/oauth/user"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { respondInvalidRequest, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type UserInfoRequest = {
  email: string
}

export type UserInfoResponse = {
  exists: boolean
  totpEnabled: boolean
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email }: Partial<UserInfoRequest> = req.query

  if (!email) {
    return respondInvalidRequest(res, "Missing email")
  }

  const user = await getUserByEmail(email)

  if (!user) {
    return respondOk(res, { exists: false, totpEnabled: false })
  }

  return respondOk(res, { exists: true, totpEnabled: await hasTOTP(user) })
}

export default withDefaultMiddleware(handleRequest(handler), ["GET"])
