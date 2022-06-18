import {
  AuthorizationServer,
  GrantType,
  AuthorizationCodeGrantType,
} from "@/oauth"
import { Scope } from "@/oauth/scope"
import { AccessToken, RefreshToken } from "@/oauth/token"
import { ACCESS_TOKEN_EXPIRATION_TIME_SECONDS } from "@/oauth/token/create"
import { AccessTokenPayload, IDToken } from "@/oauth/token/types"
import { simpleParseJWT } from "@/utils/server/jwt"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withCORSAllowed } from "@/utils/server/middleware/cors"
import { respondInvalidRequest, respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

const decodeBasicAuth = (
  req: NextApiRequest
): [string, string | null] | [null, null] => {
  const auth = req.headers.authorization
  if (!auth) {
    return [null, null]
  }
  const [, base64] = auth.split(" ")
  const [username, password] = Buffer.from(base64, "base64")
    .toString("utf-8")
    .split(":")
  if (!username) {
    return [null, null]
  }
  return [username, password || null]
}

const extractCredentials = (req: NextApiRequest) => {
  const data = req.body as Partial<RequestData>

  const [basicClientID, basicClientSecret] = decodeBasicAuth(req)

  const clientSecret = basicClientSecret || data.client_secret

  const codeVerifier = "code_verifier" in data ? data.code_verifier : undefined

  const clientID = basicClientID || data.client_id

  return {
    clientSecret,
    codeVerifier,
    clientID,
  }
}

type BaseRequestData = {
  grant_type: GrantType
  client_id: string
}

type BaseAccessRequestData = BaseRequestData & {
  grant_type: AuthorizationCodeGrantType
  code: string
  redirect_uri: string
}

type AccessRequestData = BaseAccessRequestData & {
  code_verifier?: string
  client_secret?: string
}

type RefreshRequestData = BaseRequestData & {
  refresh_token: string
  client_secret?: string
}

type RequestData = AccessRequestData | RefreshRequestData

type ValidResponseData = {
  access_token: string
  refresh_token: string
  id_token?: string
  token_type: "Bearer"
  expires_in: number
  scope: Scope[]
}
type ErrorResponseData = {
  error: string
}

type ResponseData = ValidResponseData | ErrorResponseData

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const data: Partial<RequestData> = req.body
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
  refreshToken: RefreshToken,
  idToken?: IDToken
) {
  const tokenPayload = simpleParseJWT<AccessTokenPayload>(accessToken)
  const response: ValidResponseData = {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_EXPIRATION_TIME_SECONDS,
    scope: tokenPayload.scope,
  }
  if (idToken) {
    respondOk(res, {
      ...response,
      id_token: idToken,
    })
  }
  return respondOk(res, response)
}

async function accessTokenHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const data = req.body as AccessRequestData
  const server = new AuthorizationServer()

  const { clientID, clientSecret, codeVerifier } = extractCredentials(req)

  if (
    !clientID ||
    !data.code ||
    !data.redirect_uri ||
    !(clientSecret || codeVerifier)
  ) {
    return respondInvalidRequest(res, "invalid_request")
  }

  const auth = await server.exchangeToken({
    grantType: "authorization_code",
    clientID,
    clientSecret,
    code: data.code,
    redirectURI: data.redirect_uri,
    codeVerifier,
  })
  if (typeof auth === "string") {
    return respondInvalidRequest(res, auth)
  }
  const [accessToken, refreshToken, idToken] = auth
  return respondExchange(res, accessToken, refreshToken, idToken)
}

async function refreshTokenHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const data = req.body as RefreshRequestData
  const server = new AuthorizationServer()

  const { clientID, clientSecret } = extractCredentials(req)

  if (!clientID || !data.refresh_token) {
    return respondInvalidRequest(res, "invalid_request")
  }

  const auth = await server.exchangeToken({
    grantType: "refresh_token",
    clientID,
    clientSecret,
    refreshToken: data.refresh_token,
  })
  if (typeof auth === "string") {
    return respondInvalidRequest(res, auth)
  }
  const [accessToken, refreshToken, idToken] = auth
  return respondExchange(res, accessToken, refreshToken, idToken)
}

export default withDefaultMiddleware(withCORSAllowed(handleRequest(handler)), [
  "POST",
])
