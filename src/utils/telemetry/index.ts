import { metrics } from "@opentelemetry/api-metrics"
import { JaegerExporter } from "@opentelemetry/exporter-jaeger"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { JaegerPropagator } from "@opentelemetry/propagator-jaeger"
import {
  ConsoleMetricExporter,
  MetricExporter,
} from "@opentelemetry/sdk-metrics-base"
import { NodeSDK, api } from "@opentelemetry/sdk-node"
import {
  ConsoleSpanExporter,
  SpanExporter,
} from "@opentelemetry/sdk-trace-base"
import { NextApiRequest, NextApiResponse } from "next"

const sdkRef: { sdk?: NodeSDK } = {}

const getSDK = async () => {
  if (!sdkRef.sdk) {
    // Get Jaeger exporter if in prod. Else, console exporter
    const traceExporter: SpanExporter =
      process.env.NODE_ENV === "production"
        ? new JaegerExporter({
            endpoint: "http://tempo:14268/api/traces",
            host: "tempo",
            port: 14278,
          })
        : new ConsoleSpanExporter()

    // Get Prometheus exporter if in prod. Else, console exporter
    const metricExporter: MetricExporter =
      process.env.NODE_ENV === "production"
        ? new PrometheusExporter({
            port: 9464,
          })
        : new ConsoleMetricExporter()

    // Only HTTP calls may be auto-logged
    const instrumentations = [new HttpInstrumentation({})]
    // Propagate traces using Jaeger
    const textMapPropagator = new JaegerPropagator()

    sdkRef.sdk = new NodeSDK({
      traceExporter,
      metricExporter,
      instrumentations,
      textMapPropagator,
    })
  }
  await sdkRef.sdk.start()
  return sdkRef.sdk
}

const APP_NAME = "entre-com-unicamp"
export const getTracer = () => {
  return api.trace.getTracer(APP_NAME)
}
export const getContext = () => {
  return api.context.active()
}
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

export const withTelemetry =
  (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    return handler(req, res)
  }

export const startTelemetry = async () => {
  await getSDK()
}
