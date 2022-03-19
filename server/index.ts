export const start = async () => {
  if (process.env.NODE_ENV !== "production") {
    const dotenv = await import("dotenv")
    dotenv.config()
  }

  const { startTelemetry } = await import("../src/utils/server/telemetry")
  await startTelemetry()
  const { startServer } = await import("./server")
  await startServer()
}

start()
