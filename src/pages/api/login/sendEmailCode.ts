import { generateEmailCode } from "@/utils/server/emailCodes"
import { sendEmailCode } from "@/utils/server/emailCodes/aws"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { respondInvalidRequest, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type RequestData = {
  email: string
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { email }: Partial<RequestData> = req.body

  if (!email) {
    return respondInvalidRequest(res, "Missing email")
  }

  const emailExp = new RegExp(/\w+@(?:\w+\.)?unicamp\.br/)
  if (!emailExp.test(email)) {
    return respondInvalidRequest(
      res,
      "Invalid email format. Must be a valid email and end with 'unicamp.br'"
    )
  }

  const code = await generateEmailCode(email)

  const success = await sendEmailCode(email, code)

  if (success) {
    return respondOk(res)
  }
  return respondInvalidRequest(res, "Failed to send email code")
}

export default withDefaultMiddleware(handleRequest(handler), ["POST"])
