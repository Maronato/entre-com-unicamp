import { SpanKind } from "@opentelemetry/api"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

import { startActiveSpan } from "../telemetry/trace"

export async function sendEmailCode(email: string, code: string) {
  const apiKey = process.env.AWS_API_KEY || ""
  const url = process.env.AWS_API_ENDPOINT || ""
  const payload = {
    to: email,
    code,
  }

  return startActiveSpan(
    "sendEmailCode - AWS",
    {
      attributes: {
        email,
        code,
        [SemanticAttributes.PEER_SERVICE]: "AWS API Gateway",
        [SemanticAttributes.MESSAGING_URL]: url,
        [SemanticAttributes.MESSAGING_SYSTEM]: "SES",
        [SemanticAttributes.MESSAGING_DESTINATION]: email,
        [SemanticAttributes.MESSAGING_DESTINATION_KIND]: "email",
      },
      kind: SpanKind.CLIENT,
    },
    async (span, setError) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        span.setAttributes({
          [SemanticAttributes.HTTP_STATUS_CODE]: response.status,
          "http.status_text": response.statusText,
        })
        setError("Error sending email code")
        return false
      }

      const data: {
        MessageId?: string
      } = await response.json()

      span.setAttributes({
        [SemanticAttributes.MESSAGING_MESSAGE_ID]: data.MessageId,
      })

      return true
    }
  )
}
