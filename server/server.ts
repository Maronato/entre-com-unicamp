import { createServer } from "http"
import { parse } from "url"

import next from "next"

import {
  getLogger,
  creatRequestLogger,
} from "../src/utils/server/telemetry/logs"
import { creatRequestMeter } from "../src/utils/server/telemetry/metrics"

const dev = process.env.NODE_ENV !== "production"
const port = process.env.PORT || 3000

const logger = getLogger()

const app = next({ dev })
const handle = app.getRequestHandler()

export const startServer = async () => {
  await app.prepare()

  const requestLogger = creatRequestLogger()
  const requestMeter = creatRequestMeter()

  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url || "", true)

    requestLogger(req, res, parsedUrl)
    requestMeter(req, res, parsedUrl)

    await handle(req, res, parsedUrl)
  })

  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`)
  })
}
