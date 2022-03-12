import { JSONWebKeySet } from "jose"

import { AuthorizationServer } from "@/oauth2"
import { respondMethodNotAllowed, respondOk } from "@/utils/serverUtils"
import { withTelemetry } from "@/utils/telemetry"

import type { NextApiRequest, NextApiResponse } from "next"

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JSONWebKeySet>
) {
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }
  const server = new AuthorizationServer()
  return respondOk(res, await server.getJWKS())
}

export default withTelemetry(handler)
