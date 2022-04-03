// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AuthorizationServer, isErrorCode } from "@/oauth"
import { CodeChallengeMethod } from "@/oauth/grant"
import { Scope } from "@/oauth/scope"
import { ErrorCodes } from "@/utils/common/errorCode"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import { respondInvalidRequest, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type CodeRequestData = {
  clientID: string
  responseType: "code"
  redirectUri: string
  scope?: Scope[]
  state?: string
  nonce?: string
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
type ErrorResponseData = {
  error: string
  state?: string
}

type ResponseData = ValidResponseData | ErrorResponseData

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const user = getRequestUser(req)

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
      data.state,
      data.nonce
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
    data.state,
    data.nonce
  )
  if (isErrorCode(code)) {
    return respondInvalidRequest(res, { error: code, state: data.state })
  }
  return respondOk(res, { code, state: data.state })
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler), true),
  ["POST"]
)
