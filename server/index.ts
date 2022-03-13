export const start = async () => {
  const { startTelemetry } = await import("../src/utils/telemetry")
  await startTelemetry()
  const { startServer } = await import("./server")
  await startServer()
}

start()
