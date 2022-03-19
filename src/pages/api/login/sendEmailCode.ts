import { generateEmailCode } from "@/utils/server/emailCodes"
import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
} from "@/utils/server/serverUtils"
import { getLogger } from "@/utils/server/telemetry/logs"

import type { NextApiRequest, NextApiResponse } from "next"

const logger = getLogger()

type RequestData = {
  email: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
  }
  const { email }: Partial<RequestData> = req.body

  if (!email) {
    return respondInvalidRequest(res, "Missing email")
  }

  const emailExp = new RegExp(/\w+@[[A-Za-z]+\.]?unicamp\.br/)
  if (!emailExp.test(email)) {
    return respondInvalidRequest(
      res,
      "Invalid email format. Must be a valid email and end with 'unicamp.br'"
    )
  }

  const code = await generateEmailCode(email)

  await new Promise((r) =>
    setTimeout(() => r(logger.info(`Sent code ${code} to ${email}`)), 1000)
  )

  return respondOk(res, { success: true })
}
