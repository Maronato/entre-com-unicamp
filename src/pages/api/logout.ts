import { respondMethodNotAllowed, respondOk } from "@/utils/serverUtils"
import { withTelemetry } from "@/utils/telemetry"

import { logout } from "../../utils/auth/server"

import type { NextApiRequest, NextApiResponse } from "next"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
  }

  logout(res)

  return respondOk(res)
}

export default withTelemetry(handler)
