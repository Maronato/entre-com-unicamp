import { respondMethodNotAllowed, respondOk } from "@/utils/server/serverUtils"

import { logout } from "../../utils/server/auth"

import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
  }

  logout(res)

  return respondOk(res)
}
