import { PrismaClient } from "@prisma/client"

import { createTelemetryMiddleware } from "@/utils/server/telemetry/db"
import { getLogger } from "@/utils/server/telemetry/logs"

let client: PrismaClient | undefined = undefined
let timeoutID: NodeJS.Timeout | undefined

const logger = getLogger()

const scheduleDisconnect = (client?: PrismaClient) => {
  // Makes sure that connections are cleaned up temporarely
  // 30m in prod and 10s in dev
  const timeout =
    process.env.NODE_ENV === "production" ? 1000 * 60 * 30 : 1000 * 10

  if (process.env.NODE_ENV !== "production") {
    if (timeoutID) {
      clearTimeout(timeoutID)
    }
    timeoutID = setTimeout(async () => {
      await client?.$disconnect()
      logger.info("Disconnected Prisma from database due to inactivity")
    }, timeout)
  }
}

export function getPrisma() {
  if (!client) {
    client = new PrismaClient()
    client.$use(createTelemetryMiddleware())
    logger.debug("Created Prisma instance")
  }
  scheduleDisconnect()
  return client
}

logger.error("loaded file")
