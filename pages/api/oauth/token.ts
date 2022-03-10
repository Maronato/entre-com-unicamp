import {
  AuthorizationServer,
  GrantType,
  AuthorizationCodeGrantType,
} from "../../../oauth2/authorizationServer"
import {
  AccessToken,
  RefreshToken,
} from "../../../oauth2/authorizationServer/token"

import type { NextApiRequest, NextApiResponse } from "next"

type BaseRequestData = {
  grantType: GrantType
  clientId: string
}

type BaseAccessRequestData = BaseRequestData & {
  grantType: AuthorizationCodeGrantType
  code: string
  redirectUri: string
}
type AccessPublicRequestData = BaseAccessRequestData & {
  codeVerifier: string
}
type AccessConfidentialRequestData = BaseAccessRequestData & {
  clientSecret: string
}
type AccessRequestData = AccessPublicRequestData | AccessConfidentialRequestData

type BaseRefreshRequestData = BaseRequestData & {
  refreshToken: string
}
type RefreshConfidentialRequestData = BaseRefreshRequestData & {
  clientSecret: string
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
    return res.status(405).send("Method not allowed")
  }

  const data: RequestData = req.body
  if (data.grantType === "authorization_code") {
    return accessTokenHandler(req, res)
  } else if (data.grantType === "refresh_token") {
    return refreshTokenHandler(req, res)
  }
  return res.status(400).json({ error: "unsupported_grant_type" })
}

function respondExchange(
  res: NextApiResponse<ResponseData>,
  accessToken: AccessToken,
  refreshToken: RefreshToken
) {
  return res.status(200).json({
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
    "clientSecret" in data ? data.clientSecret : data.codeVerifier

  const auth = await server.exchangeToken(
    "authorization_code",
    data.code,
    data.clientId,
    secretOrVerifier,
    data.redirectUri
  )
  if (typeof auth === "string") {
    return res.status(400).json({ error: auth })
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

  const clientSecret = "clientSecret" in data ? data.clientSecret : undefined
  const auth = await server.exchangeToken(
    "refresh_token",
    data.refreshToken,
    data.clientId,
    clientSecret
  )
  if (typeof auth === "string") {
    return res.status(400).json({ error: auth })
  }
  const [accessToken, refreshToken] = auth
  return respondExchange(res, accessToken, refreshToken)
}
