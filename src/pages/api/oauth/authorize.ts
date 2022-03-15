// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AuthorizationServer, isErrorCode } from "@/oauth2"
import { CodeChallengeMethod } from "@/oauth2/grant"
import { Scope } from "@/oauth2/scope"
import { isAuthenticated } from "@/utils/auth/server"
import { ErrorCodes } from "@/utils/errorCode"
import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
  respondUnauthorized,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type CodeRequestData = {
  clientID: string
  responseType: "code"
  redirectUri: string
  scope?: Scope[]
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
  const data: Partial<RequestData> = req.body

  if (!data.responseType || !data.clientID || !data.redirectUri) {
    return respondInvalidRequest(res, {
      error: ErrorCodes.INVALID_REQUEST,
      state: data.state,
    })
  }

  if (
    "codeChallenge" in data &&
    data.codeChallenge &&
    data.codeChallengeMethod
  ) {
    const code = await server.authorize(
      data.responseType,
      {
        clientID: data.clientID,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
      },
      user.id,
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
    { clientID: data.clientID },
    user.id,
    data.redirectUri,
    data.scope,
    data.state
  )
  if (isErrorCode(code)) {
    return respondInvalidRequest(res, { error: code, state: data.state })
  }
  return respondOk(res, { code, state: data.state })
}
