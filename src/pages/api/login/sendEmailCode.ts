import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
} from "@/utils/serverUtils"
import { getLogger } from "@/utils/telemetry/logs"

import { getPrisma } from "../../../utils/db"
import { createRandomString } from "../../../utils/random"

import type { NextApiRequest, NextApiResponse } from "next"

const logger = getLogger()

type RequestData = {
  email?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
  }
  const { email }: RequestData = req.body

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

  const prisma = getPrisma()
  const code = createRandomString(2).toUpperCase()
  const emailCode = await prisma.email_codes.create({
    data: { email, code, expires_in: 3600 },
  })

  await new Promise((r) =>
    setTimeout(
      () => r(logger.info(`Sent code ${emailCode.code} to ${emailCode.email}`)),
      1000
    )
  )

  return respondOk(res, { success: true })
}
