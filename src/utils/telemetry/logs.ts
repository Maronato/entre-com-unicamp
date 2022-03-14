import { IncomingMessage, ServerResponse } from "http"
import { UrlWithParsedQuery } from "url"

import { transports, format, createLogger, Logger } from "winston"

let logger: Logger | undefined = undefined

export const getLogger = () => {
  if (!logger) {
    let consoleFormat = format.combine(
      format.colorize(),
      format.timestamp(),
      format.errors()
    )
    if (process.env.NODE_ENV === "production") {
      consoleFormat = format.combine(
        consoleFormat,
        format.uncolorize(),
        format.json()
      )
    } else {
      consoleFormat = format.combine(consoleFormat, format.simple())
    }

    logger = createLogger({
      level: process.env.LOG_LEVEL || "info",
      transports: [new transports.Console()],
      format: consoleFormat,
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
      logger.http(`${method} ${pathname} ${res.statusCode} ${responseTime}ms`, {
        ...metadata,
        status: res.statusCode,
        response_time: responseTime,
        content_length: res.getHeader("content-length"),
      })
    })
  }
}
