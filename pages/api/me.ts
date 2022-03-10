import { ResourceOwner } from "../../oauth2/authorizationServer/resourceOwner"
import { isAuthenticated } from "../../utils/auth/server"

import type { NextApiRequest, NextApiResponse } from "next"

type ResponseData = ResourceOwner

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed")
  }
  const user = await isAuthenticated(req)
  if (!user) {
    return res.status(401).send("Must be authenticated")
  }

  return res.status(200).json(user)
}
