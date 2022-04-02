import { readFile } from "fs/promises"

import { getLogger } from "./telemetry/logs"
import { startActiveSpan } from "./telemetry/trace"

const cachedSecrets: Record<string, unknown> = {}

export const getSecret = async <T>(
  name: string,
  loader: (secret: string) => Promise<T>
): Promise<T> => {
  const logger = getLogger()
  return startActiveSpan("getSecret", async (span, setError) => {
    let secret = cachedSecrets[name] as T | undefined
    span.setAttributes({
      name,
      "from-cache": typeof secret !== "undefined",
    })

    if (typeof secret === "undefined") {
      try {
        const secretFile = await readFile(`/run/secrets/${name}`, {
          encoding: "utf8",
        })
        secret = await loader(secretFile)
      } catch (e) {
        setError(`Failed to read secret`)
        logger.error(e)
        throw e
      }
    }
    return secret
  })
}
