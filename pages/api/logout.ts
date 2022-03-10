import { logout } from "../../utils/auth/server"

import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed")
  }

  logout(res)

  return res.status(200).json({})
}
