import { RedisCommandArgument } from ".pnpm/@node-redis+client@1.0.4/node_modules/@node-redis/client/dist/lib/commands"
import { SpanKind } from "@opentelemetry/api"
import { Histogram } from "@opentelemetry/api-metrics"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"
import { createClient, RedisClientType } from "redis"

import { getInstruments } from "./telemetry/metrics"
import { startActiveSpan } from "./telemetry/trace"

class Redis {
  protected client: RedisClientType
  protected host: string
  protected port: number
  protected meter: Histogram

  public get address(): string {
    return `redis://${this.host}:${this.port}`
  }

  constructor() {
    this.host = process.env.NODE_ENV === "production" ? "redis" : "localhost"
    this.port = 6379
    this.client = createClient({
      url: this.address,
    })

    this.meter = getInstruments().redisRequestDuration
  }

  startMetric(command: string, args: Record<string, string> = {}) {
    const start = new Date().getTime()
    const baseArgs = {
      command,
    }
    return (endArgs: Record<string, string> = {}) => {
      const responseTime = new Date().getTime() - start
      this.meter.record(responseTime / 1000, {
        ...baseArgs,
        ...args,
        ...endArgs,
      })
    }
  }

  connect() {
    return startActiveSpan(
      "Redis.connect",
      { kind: SpanKind.CLIENT },
      (span) => {
        span.setAttributes({
          [SemanticAttributes.DB_SYSTEM]: "redis",
          [SemanticAttributes.NET_PEER_NAME]: this.host,
          [SemanticAttributes.NET_PEER_PORT]: this.port.toString(),
          [SemanticAttributes.DB_CONNECTION_STRING]: this.address,
        })

        return this.client.connect()
      }
    )
  }

  async set(...args: Parameters<RedisClientType["set"]>) {
    return startActiveSpan("Redis.set", (span, setError) => {
      span.setAttributes({
        key: args[0].toString(),
        value: args[1].toString(),
        options: JSON.stringify(args[2] || {}),
      })

      if (typeof args[0] !== "string") {
        setError("Invalid set first argument type")
        return
      }

      return startActiveSpan(
        "redis-SET",
        { kind: SpanKind.CLIENT },
        async (span) => {
          const [key, value, options] = args

          span.setAttributes({
            [SemanticAttributes.DB_SYSTEM]: "redis",
            [SemanticAttributes.DB_STATEMENT]: `SET ${key} "${value}" ${JSON.stringify(
              options
            )}`,
            [SemanticAttributes.NET_PEER_NAME]: this.host,
            [SemanticAttributes.NET_PEER_PORT]: this.port.toString(),
            [SemanticAttributes.DB_CONNECTION_STRING]: this.address,
          })

          const end = this.startMetric("SET")
          try {
            const result = await this.client.set(...args).then()
            end({ status: "success" })
            return result
          } catch (e) {
            end({ status: "failure" })
            throw e
          }
        }
      )
    })
  }

  async get(key: RedisCommandArgument) {
    return startActiveSpan("Redis.get", (span) => {
      span.setAttributes({
        key: key.toString(),
      })

      return startActiveSpan(
        "redis-GET",
        { kind: SpanKind.CLIENT },
        async (span) => {
          span.setAttributes({
            [SemanticAttributes.DB_SYSTEM]: "redis",
            [SemanticAttributes.DB_STATEMENT]: `GET ${key}`,
            [SemanticAttributes.NET_PEER_NAME]: this.host,
            [SemanticAttributes.NET_PEER_PORT]: this.port.toString(),
            [SemanticAttributes.DB_CONNECTION_STRING]: this.address,
          })

          const end = this.startMetric("GET")
          try {
            const result = await this.client.get(key)
            end({ status: "success" })
            return result
          } catch (e) {
            end({ status: "failure" })
            throw e
          }
        }
      )
    })
  }

  async del(key: RedisCommandArgument) {
    return startActiveSpan("Redis.del", (span) => {
      span.setAttributes({
        key: key.toString(),
      })

      return startActiveSpan(
        "redis-DEL",
        { kind: SpanKind.CLIENT },
        async (span) => {
          span.setAttributes({
            [SemanticAttributes.DB_SYSTEM]: "redis",
            [SemanticAttributes.DB_STATEMENT]: `DEL ${key}`,
            [SemanticAttributes.NET_PEER_NAME]: this.host,
            [SemanticAttributes.NET_PEER_PORT]: this.port.toString(),
            [SemanticAttributes.DB_CONNECTION_STRING]: this.address,
          })

          const end = this.startMetric("DEL")
          try {
            const result = await this.client.del(key)
            end({ status: "success" })
            return result
          } catch (e) {
            end({ status: "failure" })
            throw e
          }
        }
      )
    })
  }

  async getdel(key: RedisCommandArgument) {
    return startActiveSpan("Redis.getdel", (span) => {
      span.setAttributes({
        key: key.toString(),
      })

      return startActiveSpan(
        "redis-GETDEL",
        { kind: SpanKind.CLIENT },
        async (span) => {
          span.setAttributes({
            [SemanticAttributes.DB_SYSTEM]: "redis",
            [SemanticAttributes.DB_STATEMENT]: `GETDEL ${key}`,
            [SemanticAttributes.NET_PEER_NAME]: this.host,
            [SemanticAttributes.NET_PEER_PORT]: this.port.toString(),
            [SemanticAttributes.DB_CONNECTION_STRING]: this.address,
          })

          const end = this.startMetric("GETDEL")
          try {
            const result = await this.client.getDel(key)
            end({ status: "success" })
            return result
          } catch (e) {
            end({ status: "failure" })
            throw e
          }
        }
      )
    })
  }
}

let globalClient: Redis | undefined = undefined

export const getRedis = async () => {
  if (!globalClient) {
    globalClient = new Redis()
    await globalClient.connect()
  }

  return globalClient
}
