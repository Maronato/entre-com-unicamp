import { JSONWebKeySet } from "jose"

import { AuthorizationServer } from "@/oauth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JSONWebKeySet>
) {
  const server = new AuthorizationServer()
  res.setHeader("Content-Type", "application/json")
  return respondOk(res, await server.getJWKS())
}

export default withDefaultMiddleware(handleRequest(handler))
