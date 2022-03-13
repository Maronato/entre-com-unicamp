import { getPrisma } from "@/utils/db"
import {
  respondMethodNotAllowed,
  respondOk,
  respondServiceUnavailable,
} from "@/utils/serverUtils"
import { getLogger } from "@/utils/telemetry/logs"

import type { NextApiRequest, NextApiResponse } from "next"

const logger = getLogger()

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
    logger.error(e)
  }
  return respondServiceUnavailable(res, "Failed to connect to database")
}
