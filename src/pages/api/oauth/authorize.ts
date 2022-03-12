// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AuthorizationServer } from "@/oauth2"
import { CodeChallengeMethod } from "@/oauth2/grant"
import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
} from "@/utils/serverUtils"
import { withTelemetry } from "@/utils/telemetry"

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

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
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
      return respondInvalidRequest(res, { error: auth, state: data.state })
    }
    return respondOk(res, { code: auth.code, state: data.state })
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
    return respondInvalidRequest(res, { error: auth, state: data.state })
  }
  return respondOk(res, { code: auth.code, state: data.state })
}

export default withTelemetry(handler)
