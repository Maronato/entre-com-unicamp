import { metrics } from "@opentelemetry/api-metrics"
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
