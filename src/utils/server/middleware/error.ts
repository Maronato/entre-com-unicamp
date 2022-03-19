import { Exception } from "@opentelemetry/api"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

import { Handler } from "../serverUtils"
import { startActiveSpan } from "../telemetry/trace"

export const withErrorHandler =
  (handler: Handler): Handler =>
  (req, res) => {
    return startActiveSpan(
      `Middleware - withErrorHandler`,
      async (span, setError) => {
        try {
          await handler(req, res)
        } catch (e) {
          span.recordException(e as Exception)
          setError("Error handling request")
          res.status(500).send("Server error")
        } finally {
          span.setAttributes({
            [SemanticAttributes.HTTP_STATUS_CODE]: res.statusCode,
          })
        }
      }
    )
  }
