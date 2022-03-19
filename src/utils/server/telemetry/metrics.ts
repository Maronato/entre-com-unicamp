import { IncomingMessage, ServerResponse } from "http"
import { UrlWithParsedQuery } from "url"

import { metrics, ValueType } from "@opentelemetry/api-metrics"
import {
  HostMetrics,
  MetricsCollectorConfig,
} from "@opentelemetry/host-metrics"

import { APP_NAME } from "./consts"

export const getMeter = () => {
  return metrics.getMeter(APP_NAME)
}
export const getInstruments = () => {
  const meter = getMeter()
  const requests = meter.createCounter("requests", {
    description: "Counter of requests",
  })
  return {
    requests,
  }
}

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
  const meter = getMeter()

  const requestDuration = meter.createHistogram("request_duration_seconds", {
    description: "Duration of HTTP requests",
    valueType: ValueType.INT,
    unit: "milliseconds",
  })

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
      requestDuration.record(responseTime, {
        ...metadata,
        status_code: statusCode,
      })
    })
  }
}
