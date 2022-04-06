import { ClientRequest, IncomingMessage } from "http"

import { api } from "@opentelemetry/sdk-node"
import { SemanticAttributes } from "@opentelemetry/semantic-conventions"

export const updateGDERequestSpan = (
  span: api.Span,
  request: IncomingMessage | ClientRequest
) => {
  if (request instanceof ClientRequest) {
    const hostMatches = request.host.startsWith("grade.daconline.unicamp.br")
    if (hostMatches) {
      span.setAttributes({
        [SemanticAttributes.PEER_SERVICE]: "GDE",
      })
    }
  }
}
