import { ClientRequest, IncomingMessage } from "http"

import { api } from "@opentelemetry/sdk-node"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

import { startActiveSpan } from "../telemetry/trace"

const API_KEY = process.env.AWS_API_KEY || ""
const API_URL = process.env.AWS_API_ENDPOINT || ""

export const updateAPIGatewayRequestSpan = (
  span: api.Span,
  request: IncomingMessage | ClientRequest
) => {
  if (request instanceof ClientRequest) {
    const xApiKey = request.getHeader("x-api-key")
    if (typeof xApiKey === "string" && xApiKey === API_KEY) {
      span.setAttributes({
        [SemanticAttributes.PEER_SERVICE]: "AWS API Gateway",
      })
    }
  }
}

export async function sendSESEmailCode(email: string, code: string) {
  const payload = {
    to: email,
    code,
  }

  return startActiveSpan(
    "sendSESEmailCode",
    {
      attributes: {
        email,
        code,
        [SemanticAttributes.MESSAGING_URL]: API_URL,
        [SemanticAttributes.MESSAGING_SYSTEM]: "SES",
        [SemanticAttributes.MESSAGING_DESTINATION]: email,
        [SemanticAttributes.MESSAGING_DESTINATION_KIND]: "email",
      },
    },
    async (span, setError) => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "x-api-key": API_KEY,
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

export const testAPICredentials = async (url: string, key: string) => {
  return startActiveSpan("testAPICredentials", async (span, setError) => {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "x-api-key": key,
      },
    })

    if (!response.ok) {
      span.setAttributes({
        [SemanticAttributes.HTTP_STATUS_CODE]: response.status,
        "http.status_text": response.statusText,
      })
      setError("Error testing API credentials")
      return false
    }

    return true
  })
}
