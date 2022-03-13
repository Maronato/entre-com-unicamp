import { createServer } from "http"
import { parse } from "url"

import next from "next"

import { getLogger } from "../src/utils/telemetry/logs"

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()
const port = process.env.PORT || 3000
export const startServer = async () => {
  const logger = getLogger()
  await app.prepare()
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url || "", true)
    await handle(req, res, parsedUrl)
  })
  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`)
  })
}
