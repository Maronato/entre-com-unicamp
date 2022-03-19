import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { respondOk } from "@/utils/server/serverUtils"

import { logout } from "../../utils/server/auth"

import type { NextApiRequest, NextApiResponse } from "next"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  logout(res)

  return respondOk(res)
}
export default withDefaultMiddleware(handleRequest(handler), ["POST"])
