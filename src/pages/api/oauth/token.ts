import {
  AuthorizationServer,
  GrantType,
  AuthorizationCodeGrantType,
} from "@/oauth2"
import { AccessToken, RefreshToken } from "@/oauth2/token"
import {
  respondInvalidRequest,
  respondMethodNotAllowed,
  respondOk,
} from "@/utils/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

type BaseRequestData = {
  grant_type: GrantType
  client_id: string
}

type BaseAccessRequestData = BaseRequestData & {
  grant_type: AuthorizationCodeGrantType
  code: string
  redirect_uri: string
}
type AccessPublicRequestData = BaseAccessRequestData & {
  code_verifier: string
}
type AccessConfidentialRequestData = BaseAccessRequestData & {
  client_secret: string
}
type AccessRequestData = AccessPublicRequestData | AccessConfidentialRequestData

type BaseRefreshRequestData = BaseRequestData & {
  refresh_token: string
}
type RefreshConfidentialRequestData = BaseRefreshRequestData & {
  client_secret: string
}
type RefreshRequestData =
  | BaseRefreshRequestData
  | RefreshConfidentialRequestData

type RequestData = AccessRequestData | RefreshRequestData

type ValidResponseData = {
  access_token: string
  refresh_token: string
  token_type: "Bearer"
}
type ErrorResponseData = {
  error: string
}

type ResponseData = ValidResponseData | ErrorResponseData

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  if (req.method !== "POST") {
    return respondMethodNotAllowed(res)
  }

  const data: RequestData = req.body
  if (data.grant_type === "authorization_code") {
    return accessTokenHandler(req, res)
  } else if (data.grant_type === "refresh_token") {
    return refreshTokenHandler(req, res)
  }
  return respondInvalidRequest(res, "unsupported_grant_type")
}

function respondExchange(
  res: NextApiResponse<ResponseData>,
  accessToken: AccessToken,
  refreshToken: RefreshToken
) {
  return respondOk(res, {
    access_token: accessToken.token,
    refresh_token: refreshToken.token,
    token_type: "Bearer",
  })
}

async function accessTokenHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const data = req.body as AccessRequestData
  const server = new AuthorizationServer()

  const secretOrVerifier =
    "client_secret" in data ? data.client_secret : data.code_verifier

  if (
    !data.client_id ||
    !data.code ||
    !data.redirect_uri ||
    !secretOrVerifier
  ) {
    return respondInvalidRequest(res, "invalid_request")
  }

  const auth = await server.exchangeToken(
    "authorization_code",
    data.code,
    data.client_id,
    secretOrVerifier,
    data.redirect_uri
  )
  if (typeof auth === "string") {
    return respondInvalidRequest(res, auth)
  }
  const [accessToken, refreshToken] = auth
  return respondExchange(res, accessToken, refreshToken)
}

async function refreshTokenHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const data = req.body as RefreshRequestData
  const server = new AuthorizationServer()

  const clientSecret = "client_secret" in data ? data.client_secret : undefined
  const auth = await server.exchangeToken(
    "refresh_token",
    data.refresh_token,
    data.client_id,
    clientSecret
  )
  if (typeof auth === "string") {
    return respondInvalidRequest(res, auth)
  }
  const [accessToken, refreshToken] = auth
  return respondExchange(res, accessToken, refreshToken)
}
