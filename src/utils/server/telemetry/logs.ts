import { IncomingMessage, ServerResponse } from "http"
import { UrlWithParsedQuery } from "url"

import {
  transports,
  format,
  createLogger,
  Logger,
  LoggerOptions,
} from "winston"
import LokiTransport from "winston-loki"

import { APP_NAME } from "./consts"

let logger: Logger | undefined = undefined

const noUndefined = (obj: Record<string, unknown>) => {
  const newObj: Record<string, unknown> = {}
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      newObj[key] = value
    }
  })
  return newObj
}

const orderedJsonFormatter = format.printf((info) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { message, level, labels, ...rest } = info
  return JSON.stringify(
    noUndefined({
      level,
      message,
      ...rest,
    })
  )
})

export const getLogger = () => {
  if (!logger) {
    const lokiHost = `http://${
      process.env.NODE_ENV === "production" ? "loki" : "localhost"
    }:3100`

    const defaultLabels = {
      service: process.env.DOCKER_SERVICE_NAME ?? APP_NAME,
      service_id: process.env.DOCKER_SERVICE_ID,
      node: process.env.DOCKER_NODE_ID,
      node_hostname: process.env.DOCKER_NODE_HOSTNAME,
      container: process.env.DOCKER_TASK_NAME,
      container_id: process.env.DOCKER_TASK_ID,
    }

    const loggerFormat = [format.errors()]

    const loggerTransport: LoggerOptions["transports"] = [
      new LokiTransport({
        host: lokiHost,
        replaceTimestamp: true,
        labels: noUndefined(defaultLabels),
        format: format.combine(...loggerFormat, orderedJsonFormatter),
      }),
    ]

    if (process.env.NODE_ENV === "production") {
      loggerFormat.push(format.json())
    } else {
      loggerTransport.push(
        new transports.Console({
          format: format.combine(
            ...loggerFormat,
            format.colorize(),
            format.printf((info) => `${info.level}: ${info.message}`)
          ),
        })
      )
    }

    logger = createLogger({
      level: process.env.LOG_LEVEL || "info",

      transports: loggerTransport,
      format: format.combine(...loggerFormat),
    })
  }
  return logger
}

export const creatRequestLogger = () => {
  const logger = getLogger()
  return (
    req: IncomingMessage,
    res: ServerResponse,
    url: UrlWithParsedQuery
  ) => {
    const { pathname, hostname } = url
    const xForwardedFor = req.headers["x-forwarded-for"]
    const userAgent = req.headers["user-agent"]
    const referer = req.headers["referer"]
    const host = req.headers["host"] || hostname
    const httpVersion = req.httpVersion
    const method = req.method
    const remoteAddress = req.socket.remoteAddress
    const request = `${method} ${pathname} HTTP/${httpVersion}`

    const metadata = {
      host,
      pathname,
      method,
      request,
      http_x_forwarded_for: xForwardedFor,
      http_user_agent: userAgent,
      http_referer: referer,
      remote_addr: remoteAddress,
    }

    const start = new Date().getTime()
    res.on("finish", () => {
      const responseTime = new Date().getTime() - start
      const status = res.statusCode
      logger.http(`${method} ${pathname} ${res.statusCode} ${responseTime}ms`, {
        ...metadata,
        status,
        response_time: responseTime,
        content_length: res.getHeader("content-length"),
        labels: {
          status,
          method,
        },
      })
    })
  }
}
