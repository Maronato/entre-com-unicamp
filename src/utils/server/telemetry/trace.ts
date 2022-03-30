import { SpanStatusCode, Span, Exception } from "@opentelemetry/api"
import { api } from "@opentelemetry/sdk-node"

import { APP_NAME } from "./consts"

const getTracer = () => {
  return api.trace.getTracer(APP_NAME)
}

/**
 * Start active span
 *
 * Same as Tracer.startActiveSpan, but it automatically ends the span
 * If any uncaught errors reach it, it automatically sets the span as failed
 *
 * @param name Span name
 * @param fn Callback with active span
 */
export function startActiveSpan<
  F extends (span: Span, setError: (message?: string) => void) => unknown
>(name: string, fn: F): ReturnType<F>
export function startActiveSpan<
  F extends (span: Span, setError: (message?: string) => void) => unknown
>(name: string, options: api.SpanOptions, fn: F): ReturnType<F>
export function startActiveSpan<
  F extends (span: Span, setError: (message?: string) => void) => unknown
>(name: string, optionsOrFn: F | api.SpanOptions, maybeFn?: F): ReturnType<F> {
  const [options, fn] = (
    typeof optionsOrFn === "function"
      ? [{}, optionsOrFn]
      : [optionsOrFn, maybeFn]
  ) as [api.SpanOptions, F]
  const tracer = getTracer()
  return tracer.startActiveSpan(name, options, (span) => {
    span.setStatus({
      code: SpanStatusCode.OK,
    })
    const setError = (message?: string) => {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message,
      })
    }
    let result: ReturnType<F>
    try {
      result = fn(span, setError) as ReturnType<F>
    } catch (e) {
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.recordException(e as Exception)
      throw e
    }
    if (result instanceof Promise) {
      return result
        .catch((reason) => {
          span.setStatus({ code: SpanStatusCode.ERROR })
          span.recordException(reason)
          return Promise.reject(reason)
        })
        .finally(() => span.end()) as ReturnType<F>
    }
    span.end()
    return result as ReturnType<F>
  })
}
