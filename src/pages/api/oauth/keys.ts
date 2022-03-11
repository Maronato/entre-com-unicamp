import { JSONWebKeySet } from "jose"

import { AuthorizationServer } from "@/oauth2"
import { respondMethodNotAllowed } from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JSONWebKeySet>
) {
  if (req.method !== "GET") {
    return respondMethodNotAllowed(res)
  }
  const server = new AuthorizationServer()
  res.status(200).json(await server.getJWKS())
}
