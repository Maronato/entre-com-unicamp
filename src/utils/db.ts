import { PrismaClient } from "@prisma/client"

import { createTracerMiddleware } from "./telemetry/db"

let client: PrismaClient | undefined = undefined

export function getPrisma() {
  if (!client) {
    client = new PrismaClient()
    client.$use(createTracerMiddleware())
  }
  return client
}
