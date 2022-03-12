import { Exception, SpanStatusCode } from "@opentelemetry/api"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"
import { parse } from "pg-connection-string"

import type { PrismaClient } from "@prisma/client"

import { getTracer } from "."

export type Action =
  | "findOne"
  | "findMany"
  | "create"
  | "update"
  | "updateMany"
  | "upsert"
  | "delete"
  | "deleteMany"
  | "executeRaw"
  | "queryRaw"
  | "aggregate"

type Middleware = Parameters<PrismaClient["$use"]>[0]

export function createTracerMiddleware() {
  const middleware: Middleware = async (params, next) => {
    const tracer = getTracer()
    return await tracer.startActiveSpan(
      `${params.model}.${params.action}`,
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
        try {
          const result = await next(params)
          span.setStatus({
            code: SpanStatusCode.OK,
          })
          return result
        } catch (e) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
          })
          span.recordException(e as Exception)
          throw e
        } finally {
          span.end()
        }
      }
    )
  }
  return middleware
}
