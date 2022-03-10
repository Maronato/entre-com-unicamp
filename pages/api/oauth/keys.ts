import { JSONWebKeySet } from 'jose'
import type { NextApiRequest, NextApiResponse } from 'next'
import { AuthorizationServer } from "../../../oauth2/authorizationServer"


export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<JSONWebKeySet>
) {
  const server = new AuthorizationServer()
  res.status(200).json(await server.getJWKS())
}
