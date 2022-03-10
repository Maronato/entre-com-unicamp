import { ResourceOwner } from "../../../oauth2/authorizationServer/resourceOwner"
import { login } from "../../../utils/auth/server"
import { getPrisma } from "../../../utils/db"
import { delay } from "../../../utils/misc"

import type { NextApiRequest, NextApiResponse } from "next"

type RequestData = {
  code?: string
  email?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ user: ResourceOwner } | string>
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed")
  }
  const { email, code }: RequestData = req.body

  if (!email) {
    return res.status(401).send("Missing email")
  }
  if (!code) {
    return res.status(401).send("Missing code")
  }

  const prisma = getPrisma()
  const emailCode = await prisma.email_codes.findFirst({
    where: { AND: { code, email } },
  })
  if (!emailCode) {
    await delay(3000)
    return res.status(401).send("Invalid credentials")
  }
  let resourceOwner = await prisma.resource_owners.findFirst({
    where: { email },
  })
  if (!resourceOwner) {
    resourceOwner = await prisma.resource_owners.create({ data: { email } })
  }
  const user = new ResourceOwner(
    resourceOwner.id.toString(),
    resourceOwner.email
  )
  await login(res, user)

  // Remove used code
  await prisma.email_codes.delete({ where: { id: emailCode.id } })

  return res.status(200).json({ user })
}
