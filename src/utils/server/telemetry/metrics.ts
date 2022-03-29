import { IncomingMessage, ServerResponse } from "http"
import { UrlWithParsedQuery } from "url"

import { metrics } from "@opentelemetry/api-metrics"

import { APP_NAME } from "./consts"

const createInstruments = () => {
  const meter = metrics.getMeterProvider().getMeter(APP_NAME)
  const redisRequestDuration = meter.createHistogram(
    "redis_request_duration_seconds",
    {
      description: "Duration of redis access requests",
      boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }
  )
  const requestDuration = meter.createHistogram("request_duration_seconds", {
    description: "Duration of HTTP requests",
    boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  })
  const dbRequestDuration = meter.createHistogram(
    "database_request_duration_seconds",
    {
      description: "Duration of database access requests",
      boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }
  )
  const sendEmailDuration = meter.createHistogram(
    "ses_request_duration_seconds",
    {
      description: "Duration of email sending requests",
      boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }
  )
  const s3RequestDuration = meter.createHistogram(
    "s3_request_duration_seconds",
    {
      description: "Duration of S3 access requests",
      boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
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

export const creatRequestMeter = () => {
  const { requestDuration } = getInstruments()

  return (
    req: IncomingMessage,
    res: ServerResponse,
    url: UrlWithParsedQuery
  ) => {
    const { pathname } = url
    const method = req.method

    const metadata = {
      pathname: pathname || "",
      method: method || "UNKNOWN",
    }

    const start = new Date().getTime()
    res.on("finish", () => {
      const responseTime = new Date().getTime() - start
      const statusCode = res.statusCode.toString()
      requestDuration.record(responseTime / 1000, {
        ...metadata,
        status_code: statusCode,
      })
    })
  }
}
