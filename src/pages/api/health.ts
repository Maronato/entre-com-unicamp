import { getPrisma } from "@/prisma/db"
import { listObjects } from "@/utils/server/cdn/s3"
import { testSendEmailCode } from "@/utils/server/emailCodes"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { getRedis } from "@/utils/server/redis"
import {
  respondOk,
  respondServiceUnavailable,
} from "@/utils/server/serverUtils"
import { getLogger } from "@/utils/server/telemetry/logs"

import type { NextApiRequest, NextApiResponse } from "next"

const logger = getLogger()

const testDB = async (): Promise<true | string> => {
  let errorMessage = "DB test failed"
  try {
    const prisma = getPrisma()
    const test = await prisma.$executeRaw`SELECT 1;`
    if (test === 1) {
      return true
    }
    errorMessage = "Invalid value returned from database test query"
  } catch (e) {
    logger.error(e)
    errorMessage = "Failed to connect to database"
  }
  logger.error(`Prisma Health check failed: ${errorMessage}`)
  return errorMessage
}

const testRedis = async (): Promise<true | string> => {
  let errorMessage = "Redis test failed"
  try {
    const redis = await getRedis()
    const value = `${Math.random()}`
    const key = "health-check"
    await redis.set(key, value)
    const result = await redis.get(key)
    if (result === value) {
      return true
    }
    errorMessage = "Invalid value returned from redis test query"
  } catch (e) {
    logger.error(e)
    errorMessage = "Failed to connect to redis"
  }
  logger.error(`Redis Health check failed: ${errorMessage}`)
  return errorMessage
}

const testS3 = async (): Promise<true | string> => {
  let errorMessage = "S3 test failed"
  try {
    const response = await listObjects(1)
    if (typeof response.Name === "string") {
      return true
    }
    errorMessage = "Invalid value returned from S3 test query"
  } catch (e) {
    logger.error(e)
    errorMessage = "Failed to connect to S3"
  }
  logger.error(`S3 Health check failed: ${errorMessage}`)
  return errorMessage
}

const testSendEmail = async (): Promise<true | string> => {
  try {
    const status = await testSendEmailCode("test@email.com", "test")
    if (status) {
      return true
    }
  } catch (e) {
    logger.error(e)
  }
  const errorMessage = "Failed to send email"
  logger.error(`Send Email Health check failed: ${errorMessage}`)
  return errorMessage
}

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const tests: [string, () => Promise<true | string>][] = [
    ["database", testDB],
    ["redis", testRedis],
    ["s3", testS3],
    ["sendEmail", testSendEmail],
  ]

  const results = await Promise.all(
    tests.map(async ([name, test]) => {
      return [name, await test()] as const
    })
  )
  const failed = results.some(([, result]) => result !== true)
  const resultMap: Record<string, string | true> = {}
  results.forEach(([name, result]) => {
    resultMap[name] = result
  })

  if (failed) {
    return respondServiceUnavailable(res, {
      message: "One of more health checks failed",
      results: resultMap,
    })
  }
  return respondOk(res, { results: resultMap })
}

export default withDefaultMiddleware(handleRequest(handler), ["GET", "HEAD"])
