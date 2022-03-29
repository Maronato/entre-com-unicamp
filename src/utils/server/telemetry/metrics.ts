import { IncomingMessage, ServerResponse } from "http"
import { UrlWithParsedQuery } from "url"

import { metrics } from "@opentelemetry/api-metrics"
import {
  HostMetrics,
  MetricsCollectorConfig,
} from "@opentelemetry/host-metrics"

import { APP_NAME } from "./consts"

export const getMeter = () => {
  return metrics.getMeter(APP_NAME)
}
const getInstrumentsFactory = () => {
  const getMeters = () => {
    const meter = getMeter()
    const redisRequestDuration = meter.createHistogram(
      "redis_request_duration_seconds",
      {
        description: "Duration of redis access requests",
      }
    )
    const requestDuration = meter.createHistogram("request_duration_seconds", {
      description: "Duration of HTTP requests",
    })
    const dbRequestDuration = meter.createHistogram(
      "database_request_duration_seconds",
      {
        description: "Duration of database access requests",
      }
    )
    const sendEmailDuration = meter.createHistogram(
      "ses_request_duration_seconds",
      {
        description: "Duration of email sending requests",
      }
    )
    const s3RequestDuration = meter.createHistogram(
      "s3_request_duration_seconds",
      {
        description: "Duration of S3 access requests",
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

  let instruments: ReturnType<typeof getMeters> | undefined

  return () => {
    if (!instruments) {
      instruments = getMeters()
    }
    return instruments
  }
}

export const getInstruments = getInstrumentsFactory()

export const startHostMetrics = () => {
  const meterProvider =
    metrics.getMeterProvider() as MetricsCollectorConfig["meterProvider"]
  const hostMetrics = new HostMetrics({
    meterProvider,
    name: "host-metrics",
  })

  hostMetrics.start()
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
