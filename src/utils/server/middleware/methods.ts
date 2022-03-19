import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

import { Handler, respondMethodNotAllowed } from "../serverUtils"
import { startActiveSpan } from "../telemetry/trace"

export const withAcceptedMethods =
  (handler: Handler, acceptedMethods?: string[]): Handler =>
  (req, res) => {
    return startActiveSpan(
      `Middleware - withAcceptedMethods`,
      {
        attributes: {
          "middleware.acceptedMethods": acceptedMethods?.join(","),
          [SemanticAttributes.HTTP_METHOD]: req.method,
        },
      },
      async (span, setError) => {
        if (
          typeof acceptedMethods === "undefined" ||
          (req.method && acceptedMethods.includes(req.method))
        ) {
          await handler(req, res)
        } else {
          setError(`Method ${req.method} not allowed`)
          return respondMethodNotAllowed(res)
        }
      }
    )
  }
