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

export type RequestData = {
  clientID: string
  responseType: "code"
  redirectURI: string
  scope?: Scope[]
  state?: string
  nonce?: string
  codeChallenge?: string
  codeChallengeMethod?: CodeChallengeMethod
}

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
  const {
    clientID,
    nonce,
    redirectURI,
    responseType,
    scope,
    state,
    codeChallenge,
    codeChallengeMethod,
  }: Partial<RequestData> = req.body

  if (!responseType || !clientID || !redirectURI) {
    return respondInvalidRequest(res, {
      error: ErrorCodes.INVALID_REQUEST,
      state,
    })
  }

  const code = await server.authorize({
    responseType,
    clientID,
    redirectURI,
    userID: user.id,
    scope,
    nonce,
    codeChallenge,
    codeChallengeMethod,
    state,
  })
  if (isErrorCode(code)) {
    return respondInvalidRequest(res, { error: code, state })
  }
  return respondOk(res, { code, state })
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler), true),
  ["POST"]
)
