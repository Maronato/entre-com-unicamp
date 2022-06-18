import { allowCORS } from "../cors"
import { Handler } from "../serverUtils"
import { startActiveSpan } from "../telemetry/trace"

export const withCORSAllowed =
  (handler: Handler): Handler =>
  async (req, res) => {
    return startActiveSpan(`Middleware - withCORSAllowed`, async () => {
      allowCORS(res)
      await handler(req, res)
    })
  }
