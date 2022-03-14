// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AuthorizationServer, isErrorCode } from "@/oauth2"
import { CodeChallengeMethod } from "@/oauth2/grant"
import { isAuthenticated } from "@/utils/auth/server"
import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type CodeRequestData = {
  clientId: string
  resourceOwnerId: string
  responseType: "code"
  redirectUri: string
  scope?: string[]
  state?: string
}

export type ChallengeRequestData = CodeRequestData & {
  codeChallenge: string
  codeChallengeMethod: CodeChallengeMethod
}

export type RequestData = CodeRequestData | ChallengeRequestData

export type ValidResponseData = {
  code: string
  state?: string
}
export type ErrorResponseData = {
  error: string
  state?: string
}

type ResponseData = ValidResponseData | ErrorResponseData

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
  }
  const user = await isAuthenticated(req)
  if (!user) {
    return respondUnauthorized(res, "Invalid credentials")
  }
  const server = new AuthorizationServer()
  const data: RequestData = req.body

  if ("codeChallenge" in data) {
    const code = await server.authorize(
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
    if (isErrorCode(code)) {
      return respondInvalidRequest(res, { error: code, state: data.state })
    }
    return respondOk(res, { code, state: data.state })
  }
  const code = await server.authorize(
    data.responseType,
    { clientId: data.clientId },
    data.resourceOwnerId,
    data.redirectUri,
    data.scope,
    data.state
  )
  if (isErrorCode(code)) {
    return respondInvalidRequest(res, { error: code, state: data.state })
  }
  return respondOk(res, { code, state: data.state })
}
