import { PrismaClient } from "@prisma/client"

import { createTelemetryMiddleware } from "./telemetry/db"

let client: PrismaClient | undefined = undefined

export function getPrisma() {
  if (!client) {
    client = new PrismaClient()
    client.$use(createTelemetryMiddleware())
  }
  return client
}
