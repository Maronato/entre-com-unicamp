import { JaegerExporter } from "@opentelemetry/exporter-jaeger"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston"
import { JaegerPropagator } from "@opentelemetry/propagator-jaeger"
import { api, NodeSDK } from "@opentelemetry/sdk-node"
import {
  ConsoleSpanExporter,
  SpanExporter,
} from "@opentelemetry/sdk-trace-base"

import { startHostMetrics } from "./metrics"

const sdkRef: { sdk?: NodeSDK } = {}

const exportConsoleTraces = true

const getSDK = async () => {
  if (!sdkRef.sdk) {
    // Get Jaeger exporter if in prod. Else, console exporter
    const traceExporter: SpanExporter | undefined =
      process.env.NODE_ENV === "production"
        ? new JaegerExporter({
            endpoint: "http://tempo:14268/api/traces",
            host: "tempo",
            port: 14278,
          })
        : exportConsoleTraces
        ? new ConsoleSpanExporter()
        : undefined

    // Get Prometheus exporter if in prod. Else, console exporter
    const metricExporter = new PrometheusExporter({
      port: 9464,
    })

    // Only HTTP and winston logs calls may be auto-logged
    const instrumentations = [
      new HttpInstrumentation({}),
      new WinstonInstrumentation({}),
    ]
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

export const getContext = () => {
  return api.context.active()
}

export const startTelemetry = async () => {
  await getSDK()
  startHostMetrics()
  api.diag.setLogger(
    new api.DiagConsoleLogger(),
    process.env.LOG_LEVEL === "debug"
      ? api.DiagLogLevel.ALL
      : api.DiagLogLevel.INFO
  )

  const logger = (await import("./logs")).getLogger()
  logger.info("Started telemetry service")
}
