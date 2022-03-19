import { JSONWebKeySet } from "jose"

import { AuthorizationServer } from "@/oauth"
import { respondMethodNotAllowed, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JSONWebKeySet>
) {
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }
  const server = new AuthorizationServer()
  return respondOk(res, await server.getJWKS())
}
