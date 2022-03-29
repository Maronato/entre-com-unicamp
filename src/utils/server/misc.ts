import { startActiveSpan } from "./telemetry/trace"

export function delay(duration: number) {
  return startActiveSpan(
    "delay",
    { attributes: { duration } },
    () => new Promise<void>((r) => setTimeout(r, duration))
  )
}
