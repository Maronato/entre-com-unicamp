// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AuthorizationServer } from "../../../oauth2/authorizationServer"
import { CodeChallengeMethod } from "../../../oauth2/authorizationServer/grant"

import type { NextApiRequest, NextApiResponse } from "next"

type CodeRequestData = {
  clientId: string
  resourceOwnerId: string
  responseType: "code"
  redirectUri: string
  scope: string[]
  state?: string
}

type ChallengeRequestData = CodeRequestData & {
  codeChallenge: string
  codeChallengeMethod: CodeChallengeMethod
}

type RequestData = CodeRequestData | ChallengeRequestData

type ValidResponseData = {
  code: string
  state?: string
}
type ErrorResponseData = {
  error: string
  state?: string
}

type ResponseData = ValidResponseData | ErrorResponseData

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed")
  }
  const server = new AuthorizationServer()
  const data: RequestData = req.body

  if ("codeChallenge" in data) {
    const auth = await server.authorize(
      data.responseType,
      {
        clientId: data.clientId,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
      },
      data.resourceOwnerId,
      data.redirectUri,
      data.scope,
      data.state
    )
    if (typeof auth === "string") {
      return res.status(400).json({ error: auth, state: data.state })
    }
    return res.status(200).json({ code: auth.code, state: data.state })
  }
  const auth = await server.authorize(
    data.responseType,
    { clientId: data.clientId },
    data.resourceOwnerId,
    data.redirectUri,
    data.scope,
    data.state
  )
  if (typeof auth === "string") {
    return res.status(400).json({ error: auth, state: data.state })
  }
  return res.status(200).json({ code: auth.code, state: data.state })
}
