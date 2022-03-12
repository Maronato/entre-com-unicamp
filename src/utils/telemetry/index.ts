import { SpanKind, SpanStatusCode } from "@opentelemetry/api"
import { metrics } from "@opentelemetry/api-metrics"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { JaegerExporter } from "@opentelemetry/exporter-jaeger"
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus"
import {
  ConsoleMetricExporter,
  MetricExporter,
} from "@opentelemetry/sdk-metrics-base"
import { NodeSDK, api } from "@opentelemetry/sdk-node"
import {
  ConsoleSpanExporter,
  SpanExporter,
} from "@opentelemetry/sdk-trace-base"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"
import { NextApiRequest, NextApiResponse } from "next"

const sdkRef: { sdk?: NodeSDK } = {}

const getSDK = async () => {
  if (!sdkRef.sdk) {
    const traceExporter: SpanExporter =
      process.env.NODE_ENV === "production"
        ? new JaegerExporter({
            endpoint: "http://tempo:14268/api/traces",
            host: "tempo",
            port: 14278,
          })
        : new ConsoleSpanExporter()
    const metricExporter: MetricExporter =
      process.env.NODE_ENV === "production"
        ? new PrometheusExporter({
            port: 9464,
          })
        : new ConsoleMetricExporter()

    const instrumentations = getNodeAutoInstrumentations()

    sdkRef.sdk = new NodeSDK({
      traceExporter,
      metricExporter,
      instrumentations,
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

const getRootCtx = (req: NextApiRequest) => {
  const traceId = req.headers["uber-trace-id"] || req.headers["x-trace-id"]
  const tracer = getTracer()

  const rootSpanContext = tracer.startSpan("root").spanContext()

  return api.trace.setSpanContext(
    getContext(),
    traceId && !Array.isArray(traceId)
      ? {
          ...rootSpanContext,
          traceId,
        }
      : rootSpanContext
  )
}

export const withTelemetry =
  (handler: (req: NextApiRequest, res: NextApiResponse) => Promise<unknown>) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const tracer = getTracer()

    const rootCtx = getRootCtx(req)

    await api.context.with(rootCtx, async () => {
      const span = tracer.startSpan(`${req.method} ${req.url}`, {
        kind: SpanKind.SERVER,
        attributes: {
          [SemanticAttributes.HTTP_METHOD]: req.method,
          [SemanticAttributes.HTTP_URL]: req.url,
          [SemanticAttributes.HTTP_CLIENT_IP]:
            req.headers["x-forwarded-for"] ||
            req.headers["x-real-ip"] ||
            req.socket.remoteAddress,
          [SemanticAttributes.NET_PEER_IP]: req.socket.remoteAddress,
        },
      })

      // Create base context
      const ctx = api.trace.setSpan(getContext(), span)

      res.setHeader("x-trace-id", span.spanContext().traceId)
      res.setHeader("uber-trace-id", span.spanContext().traceId)

      // Call handler with context and span
      await api.context.with(ctx, () => handler(req, res))

      // Set status to match http response
      span.setStatus({
        code: res.statusCode < 400 ? SpanStatusCode.OK : SpanStatusCode.ERROR,
      })
      // End the span
      span.end()
    })
  }

export const startTelemetry = async () => {
  await getSDK()
}
