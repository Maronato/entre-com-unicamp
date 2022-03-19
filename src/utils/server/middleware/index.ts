import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

import { Handler } from "../serverUtils"
import { startActiveSpan } from "../telemetry/trace"

import { withErrorHandler } from "./error"
import { withAcceptedMethods } from "./methods"

export const handleRequest =
  (handler: Handler): Handler =>
  (req, res) => {
    const route = new URL(req.url || "", `http://${req.headers["host"]}`)
      .pathname

    return startActiveSpan(
      `Handler ${req.method} ${route}`,
      {
        attributes: {
          route,
          [SemanticAttributes.HTTP_HOST]: req.headers["host"],
          [SemanticAttributes.HTTP_METHOD]: req.method,
          [SemanticAttributes.HTTP_ROUTE]: route,
          [SemanticAttributes.HTTP_URL]: req.url,
        },
      },
      async (span) => {
        try {
          await handler(req, res)
        } finally {
          span.setAttributes({
            [SemanticAttributes.HTTP_STATUS_CODE]: res.statusCode,
          })
        }
      }
    )
  }

export const withDefaultMiddleware = (
  handler: Handler,
  methods: string[] = ["GET"]
): Handler => withErrorHandler(withAcceptedMethods(handler, methods))
