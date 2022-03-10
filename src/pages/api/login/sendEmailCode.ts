import { getPrisma } from "../../../utils/db"
import { createRandomString } from "../../../utils/random"

import type { NextApiRequest, NextApiResponse } from "next"

type RequestData = {
  email?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed")
  }
  const { email }: RequestData = req.body

  if (!email) {
    return res.status(400).send("Missing email")
  }

  const prisma = getPrisma()

  const code = createRandomString(2).toUpperCase()
  const emailCode = await prisma.email_codes.create({
    data: { email, code, expires_in: 3600 },
  })

  await new Promise((r) =>
    setTimeout(
      () => r(console.log(`Sent code ${emailCode.code} to ${emailCode.email}`)),
      1000
    )
  )

  return res.status(200).send("Success")
}
