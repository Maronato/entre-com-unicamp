import { SpanKind } from "@opentelemetry/api"
import { ValueType } from "@opentelemetry/api-metrics"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"
import { parse } from "pg-connection-string"

import type { PrismaClient } from "@prisma/client"

import { getMeter } from "./metrics"
import { startActiveSpan } from "./trace"

type Middleware = Parameters<PrismaClient["$use"]>[0]

export function createTelemetryMiddleware() {
  const meter = getMeter()
  const dbRequestDuration = meter.createHistogram(
    "database_request_duration_seconds",
    {
      description: "Duration of dabatace access requests",
      unit: "milliseconds",
      valueType: ValueType.INT,
    }
  )

  return startActiveSpan("createTelemetryMiddleware", () => {
    const middleware: Middleware = async (params, next) => {
      return startActiveSpan(
        `db.${params.model}.${params.action}`,
        { kind: SpanKind.CLIENT },
        async (span) => {
          const connConfig = parse(process.env.DATABASE_URL || "")

          span.setAttributes({
            [SemanticAttributes.DB_SYSTEM]: "postgresql",
            [SemanticAttributes.DB_NAME]: connConfig.database || undefined,
            [SemanticAttributes.DB_USER]: connConfig.user,
            [SemanticAttributes.DB_SQL_TABLE]: params.model,
            [SemanticAttributes.DB_OPERATION]: params.action,
            [SemanticAttributes.NET_PEER_PORT]: connConfig.port || undefined,
            [SemanticAttributes.NET_PEER_NAME]: connConfig.host || undefined,
          })

          const start = new Date().getTime()
          const recordDuration = (success: boolean) => {
            dbRequestDuration.record(new Date().getTime() - start, {
              model: params.model || "undefined",
              action: params.action,
              status: success ? "success" : "failure",
            })
          }

          try {
            const result = await next(params)
            recordDuration(true)
            return result
          } catch (e) {
            recordDuration(false)
            throw e
          }
        }
      )
    }
    return middleware
  })
}
