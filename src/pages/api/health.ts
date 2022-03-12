import { getPrisma } from "@/utils/db"
import {
  respondMethodNotAllowed,
  respondOk,
  respondServiceUnavailable,
} from "@/utils/serverUtils"
import { withTelemetry } from "@/utils/telemetry"

import type { NextApiRequest, NextApiResponse } from "next"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }

  const prisma = getPrisma()
  try {
    const test = await prisma.$executeRaw`SELECT 1;`
    if (test === 1) {
      return respondOk(res)
    }
    return respondServiceUnavailable(
      res,
      "Invalid value returned from database test query"
    )
  } catch (e) {
    console.error(e)
  }
  return respondServiceUnavailable(res, "Failed to connect to database")
}

export default withTelemetry(handler)
