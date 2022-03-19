import { JaegerExporter } from "@opentelemetry/exporter-jaeger"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston"
import { JaegerPropagator } from "@opentelemetry/propagator-jaeger"
import { api, NodeSDK, resources } from "@opentelemetry/sdk-node"
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions"

import { APP_NAME } from "./consts"
import { startHostMetrics } from "./metrics"

const sdkRef: { sdk?: NodeSDK } = {}

const getSDK = async () => {
  if (!sdkRef.sdk) {
    // Get Jaeger exporter if in prod. Else, console exporter
    const jaegerEndpoint =
      process.env.JAEGER_ENDPOINT ?? "http://tempo:14268/api/traces"

    const traceExporter = new JaegerExporter({
      endpoint: jaegerEndpoint,
    })

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
      resource: new resources.Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: APP_NAME,
      }),
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
