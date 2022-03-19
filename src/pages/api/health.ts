import { getPrisma } from "@/prisma/db"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import {
  respondOk,
  respondServiceUnavailable,
} from "@/utils/server/serverUtils"
import { getLogger } from "@/utils/server/telemetry/logs"

import type { NextApiRequest, NextApiResponse } from "next"

const logger = getLogger()

async function handler(_req: NextApiRequest, res: NextApiResponse) {
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
    logger.error(e)
  }
  return respondServiceUnavailable(res, "Failed to connect to database")
}

export default withDefaultMiddleware(handleRequest(handler), ["GET", "HEAD"])
