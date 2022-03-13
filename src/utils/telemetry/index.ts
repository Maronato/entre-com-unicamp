import { JaegerExporter } from "@opentelemetry/exporter-jaeger"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston"
import { JaegerPropagator } from "@opentelemetry/propagator-jaeger"
import {
  ConsoleMetricExporter,
  MetricExporter,
} from "@opentelemetry/sdk-metrics-base"
import { api, NodeSDK } from "@opentelemetry/sdk-node"
import {
  ConsoleSpanExporter,
  SpanExporter,
} from "@opentelemetry/sdk-trace-base"

const sdkRef: { sdk?: NodeSDK } = {}
const exportConsoleMetrics = false

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
    const metricExporter: MetricExporter | undefined =
      process.env.NODE_ENV === "production"
        ? new PrometheusExporter({
            port: 9464,
          })
        : exportConsoleMetrics
        ? new ConsoleMetricExporter()
        : undefined

    // Only HTTP and winston logs calls may be auto-logged
    const instrumentations = [
      new HttpInstrumentation({}),
      new WinstonInstrumentation(),
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
}
