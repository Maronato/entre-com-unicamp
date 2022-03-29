import { SpanKind } from "@opentelemetry/api"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"
import { parse } from "pg-connection-string"

import type { PrismaClient } from "@prisma/client"

import { getInstruments } from "./metrics"
import { startActiveSpan } from "./trace"

type Middleware = Parameters<PrismaClient["$use"]>[0]

export function createTelemetryMiddleware() {
  const { dbRequestDuration } = getInstruments()

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
              table: params.model || "undefined",
              action: params.action,
              status: success ? "success" : "failure",
              system: "postgresql",
              database: connConfig.database || "undefined",
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
