import { IncomingMessage, ServerResponse } from "http"
import { UrlWithParsedQuery } from "url"

import { Histogram, metrics } from "@opentelemetry/api-metrics"

import { APP_NAME } from "./consts"

const createInstruments = () => {
  const meter = metrics.getMeterProvider().getMeter(APP_NAME)
  const boundaries = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
  const redisRequestDuration = meter.createHistogram(
    "redis_request_duration_seconds",
    {
      description: "Duration of redis access requests",
      boundaries,
    }
  )
  const requestDuration = meter.createHistogram("request_duration_seconds", {
    description: "Duration of HTTP requests",
    boundaries,
  })
  const dbRequestDuration = meter.createHistogram(
    "database_request_duration_seconds",
    {
      description: "Duration of database access requests",
      boundaries,
    }
  )
  const sendEmailDuration = meter.createHistogram(
    "ses_request_duration_seconds",
    {
      description: "Duration of email sending requests",
      boundaries,
    }
  )
  const s3RequestDuration = meter.createHistogram(
    "s3_request_duration_seconds",
    {
      description: "Duration of S3 access requests",
      boundaries,
    }
  )

  return {
    redisRequestDuration,
    requestDuration,
    dbRequestDuration,
    sendEmailDuration,
    s3RequestDuration,
  } as const
}

type Instruments = ReturnType<typeof createInstruments>

declare global {
  // eslint-disable-next-line no-var
  var instruments: Instruments | undefined
}

export const registerInstruments = async () => {
  if (!global.instruments) {
    global.instruments = createInstruments()
  }
}

export const getInstruments = () => {
  if (!global.instruments) {
    throw new Error("Instruemnts not initialized")
  }
  return global.instruments
}

export const startHistogram = (
  hist: Histogram,
  baseArgs: Record<string, string> = {}
) => {
  const start = new Date().getTime()
  return (endArgs: Record<string, string> = {}) => {
    const responseTime = new Date().getTime() - start
    hist.record(responseTime / 1000, {
      ...baseArgs,
      ...endArgs,
    })
  }
}

export const startStatusHistogram = (
  hist: Histogram,
  baseArgs: Record<string, string> = {}
) => {
  const record = startHistogram(hist, baseArgs)
  return (success?: boolean, endArgs: Record<string, string> = {}) => {
    return record({ success: success ? "success" : "failure", ...endArgs })
  }
}

export const creatRequestMeter = () => {
  const { requestDuration } = getInstruments()

  return (
    req: IncomingMessage,
    res: ServerResponse,
    url: UrlWithParsedQuery
  ) => {
    const { pathname } = url
    const method = req.method

    const record = startHistogram(requestDuration, {
      pathname: pathname || "",
      method: method || "UNKNOWN",
    })
    res.on("finish", () => {
      record({
        status_code: res.statusCode.toString(),
      })
    })
  }
}
