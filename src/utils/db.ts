import { PrismaClient } from "@prisma/client"

import { createTelemetryMiddleware } from "./telemetry/db"
import { startActiveSpan } from "./telemetry/trace"

let client: PrismaClient | undefined = undefined

export function getPrisma() {
  return startActiveSpan("getPrisma", (span) => {
    span.setAttribute("initialized", true)
    if (!client) {
      span.setAttribute("initialized", false)
      client = new PrismaClient()
      client.$use(createTelemetryMiddleware())
    }
    return client
  })
}
