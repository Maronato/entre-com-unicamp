import { SpanKind } from "@opentelemetry/api"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

import { getLogger } from "../telemetry/logs"
import { startActiveSpan } from "../telemetry/trace"

export async function sendConsoleEmailCode(email: string, code: string) {
  const payload = {
    to: email,
    code,
  }
  const logger = getLogger()

  return startActiveSpan(
    "sendConsoleEmailCode",
    {
      attributes: {
        email,
        code,
        [SemanticAttributes.PEER_SERVICE]: "Console logger",
        [SemanticAttributes.MESSAGING_SYSTEM]: "Console",
        [SemanticAttributes.MESSAGING_DESTINATION]: email,
        [SemanticAttributes.MESSAGING_DESTINATION_KIND]: "email",
      },
      kind: SpanKind.CLIENT,
    },
    async () => {
      logger.info("Sending email code", payload)

      return true
    }
  )
}
