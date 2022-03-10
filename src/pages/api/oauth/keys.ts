import { JSONWebKeySet } from "jose"

import { AuthorizationServer } from "@/oauth2"

import type { NextApiRequest, NextApiResponse } from "next"

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<JSONWebKeySet>
) {
  const server = new AuthorizationServer()
  res.status(200).json(await server.getJWKS())
}
