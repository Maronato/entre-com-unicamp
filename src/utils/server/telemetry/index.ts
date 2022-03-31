import { JaegerExporter } from "@opentelemetry/exporter-jaeger"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis"
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston"
import { JaegerPropagator } from "@opentelemetry/propagator-jaeger"
import { api, NodeSDK, resources } from "@opentelemetry/sdk-node"
import {
  SemanticAttributes,
  SemanticResourceAttributes,
} from "@opentelemetry/semantic-conventions"

import { updateS3RequestSpan } from "../cdn/s3"
import { updateAPIGatewayRequestSpan } from "../emailCodes/aws"

import { APP_NAME } from "./consts"
import { registerInstruments } from "./metrics"

const sdkRef: { sdk?: NodeSDK } = {}

const getSDK = async () => {
  if (!sdkRef.sdk) {
    const jaegerHost =
      process.env.NODE_ENV === "production" ? "tempo" : "localhost"

    const traceExporter = new JaegerExporter({
      endpoint: `http://${jaegerHost}:14268/api/traces`,
    })

    // Get Prometheus exporter if in prod. Else, console exporter
    const metricExporter = new PrometheusExporter({
      port: 9464,
    })

    // Instrument http, winston, ioredis, pg
    const instrumentations = [
      new HttpInstrumentation({
        ignoreOutgoingUrls: [
          (url) => {
            // Ignore loki and jarger requests
            return [/:14268\/api\/traces/, /:3100\/loki\/api\/v1\/push/].some(
              (rgx) => rgx.test(url)
            )
          },
        ],
        requireParentforOutgoingSpans: true,
        serverName: APP_NAME,
        requestHook: (span, request) => {
          // Set the peer service to AWS S3 if the request is for AWS S3
          updateS3RequestSpan(span, request)
          updateAPIGatewayRequestSpan(span, request)
        },
      }),
      new WinstonInstrumentation(),
      new IORedisInstrumentation({
        requestHook: (span) => {
          span.setAttributes({
            [SemanticAttributes.PEER_SERVICE]: "redis",
          })
        },
      }),
    ]
    // Propagate traces using Jaeger
    const textMapPropagator = new JaegerPropagator()

    sdkRef.sdk = new NodeSDK({
      traceExporter,
      metricExporter,
      instrumentations,
      textMapPropagator,
      resource: new resources.Resource({
        [SemanticResourceAttributes.SERVICE_NAME]:
          process.env.DOCKER_SERVICE_NAME ?? APP_NAME,
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
  // Load SDK
  await getSDK()
  // Register instruments
  await registerInstruments()

  api.diag.setLogger(
    new api.DiagConsoleLogger(),
    process.env.LOG_LEVEL === "debug"
      ? api.DiagLogLevel.ALL
      : api.DiagLogLevel.INFO
  )

  const logger = (await import("./logs")).getLogger()
  logger.info("Started telemetry service")
}
