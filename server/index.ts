import { startTelemetry } from "../src/utils/telemetry"

import { startServer } from "./server"

export const start = async () => {
  await startTelemetry()
  await startServer()
}

start()
