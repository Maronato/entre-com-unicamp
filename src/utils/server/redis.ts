import RedisClient, { Redis as RedisInstance } from "ioredis"

import { getInstruments, startHistogram } from "./telemetry/metrics"
import { startActiveSpan } from "./telemetry/trace"

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var redis: RedisInstance | undefined
}

const buildCommands = (client: RedisInstance) => {
  const { redisRequestDuration } = getInstruments()
  const wrapCommand = async <T extends () => Promise<unknown>>(
    commandName: string,
    command: T
  ): Promise<ReturnType<T>> => {
    return startActiveSpan(
      `redis.${commandName} via wrapCommand`,
      { attributes: { command: commandName } },
      async () => {
        const end = startHistogram(redisRequestDuration, {
          command: commandName,
        })
        try {
          const res = await command()
          end({ status: "success" })
          return res
        } catch (e) {
          end({ status: "failure" })
          throw e
        }
      }
    )
  }
  return {
    async get(key: string) {
      return wrapCommand("get", () => client.get(key))
    },
    async set(
      key: string,
      value: string | number,
      expire?: number,
      nx?: boolean
    ) {
      return wrapCommand("set", () =>
        expire
          ? nx
            ? client.set(key, value, "EX", expire, "NX")
            : client.set(key, value, "EX", expire)
          : client.set(key, value)
      )
    },
    async del(key: string) {
      return wrapCommand("del", () => client.del(key))
    },
    async getdel(key: string) {
      return wrapCommand("getdel", async () => {
        const res = await client.get(key)
        await client.del(key)
        return res
      })
    },
  }
}

export const getRedis = async () => {
  if (!global.redis) {
    global.redis = new RedisClient()
    global.redis.del
  }

  return buildCommands(global.redis)
}
