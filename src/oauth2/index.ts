import { getJSONWebKeySet } from "@/utils/jwt"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { Client } from "./client"
import {
  createCodeGrant,
  AuthorizationCodeGrant,
  verifyCodeGrant,
  CodeChallengeMethod,
  revokeGrant,
} from "./grant"
import { ResourceOwner } from "./resourceOwner"
import { AccessToken, RefreshToken } from "./token"

enum ErrorCodes {
  INVALID_CLIENT_OR_REDIRECT_URI = "INVALID_CLIENT_OR_REDIRECT_URI",
  INVALID_RESOURCE_OWNER = "INVALID_RESOURCE_OWNER",
  UNSUPPORTED_RESPONSE_TYPE = "unsupported_response_type",
  UNSUPPORTED_GRANT_TYPE = "unsupported_grant_type",
  INVALID_REQUEST = "invalid_request",
  INVALID_GRANT = "invalid_grant",
  INVALID_CLIENT = "invalid_client",
  SERVER_ERROR = "server_error",
}

export const isErrorCode = (value: unknown): value is ErrorCodes =>
  typeof value === "string" &&
  Object.values(ErrorCodes).includes(value as ErrorCodes)

type ResponseType = "code"
export type AuthorizationCodeGrantType = "authorization_code"
export type RefreshTokenGrantType = "refresh_token"
export type GrantType = AuthorizationCodeGrantType | RefreshTokenGrantType

type ConfidentialAuth = {
  clientId: string
}

type PublicAuth = {
  clientId: string
  codeChallenge: string
  codeChallengeMethod: CodeChallengeMethod
}
export class AuthorizationServer {
  async authorize(
    responseType: ResponseType,
    auth: ConfidentialAuth,
    resourceOwnerId: string,
    redirectUri: string,
    scope?: string[],
    state?: string
  ): Promise<AuthorizationCodeGrant | ErrorCodes>
  async authorize(
    responseType: ResponseType,
    auth: PublicAuth,
    resourceOwnerId: string,
    redirectUri: string,
    scope?: string[],
    state?: string
  ): Promise<AuthorizationCodeGrant | ErrorCodes>
  async authorize(
    responseType: ResponseType,
    auth: ConfidentialAuth | PublicAuth,
    resourceOwnerId: string,
    redirectUri: string,
    scope?: string[],
    state?: string
  ): Promise<AuthorizationCodeGrant | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.authorize",
      async (span, setError) => {
        span.setAttributes({
          responseType,
          clientId: auth.clientId,
          resourceOwnerId,
          redirectUri,
          scope,
          state,
        })

        const client = await Client.getByClientID(auth.clientId)
        if (!client || !client.redirectIsValid(redirectUri)) {
          setError(ErrorCodes.INVALID_CLIENT_OR_REDIRECT_URI)
          return ErrorCodes.INVALID_CLIENT_OR_REDIRECT_URI
        }
        const resourceOwner = await ResourceOwner.get(resourceOwnerId)
        if (!resourceOwner) {
          setError(ErrorCodes.INVALID_RESOURCE_OWNER)
          return ErrorCodes.INVALID_RESOURCE_OWNER
        }
        if (responseType !== "code") {
          setError(ErrorCodes.UNSUPPORTED_RESPONSE_TYPE)
          return ErrorCodes.UNSUPPORTED_RESPONSE_TYPE
        }
        if (!scope) {
          scope = ["email"]
        }
        if (client.type === "confidential") {
          return createCodeGrant(
            client.id,
            resourceOwner.id,
            scope,
            redirectUri,
            state
          )
        }
        if (!("codeChallenge" in auth)) {
          setError(ErrorCodes.INVALID_REQUEST)
          return ErrorCodes.INVALID_REQUEST
        }
        return createCodeGrant(
          client.clientId,
          resourceOwner.id,
          scope,
          redirectUri,
          auth.codeChallenge,
          auth.codeChallengeMethod,
          state
        )
      }
    )
  }

  private async generateAccessRefreshTokenPair(
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[]
  ): Promise<[AccessToken, RefreshToken]> {
    return startActiveSpan(
      "AuthorizationServer.generateAccessRefreshTokenPair",
      async (span) => {
        span.setAttributes({
          client: client.id,
          resourceOwner: resourceOwner.id,
          scope,
        })
        const [accessToken, refreshToken] = await Promise.all([
          AccessToken.create(client, resourceOwner, scope),
          RefreshToken.create(client, resourceOwner, scope),
        ])
        return [accessToken, refreshToken] as [AccessToken, RefreshToken]
      }
    )
  }

  private async exchangeAuthorizationCode(
    code: string,
    client: Client,
    redirectURI: string,
    codeVerifierOrClientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeAuthorizationCode",
      async (span, setError) => {
        span.setAttributes({
          code,
          client: client.id,
        })

        const grant = await (codeVerifierOrClientSecret
          ? verifyCodeGrant(
              code,
              client.clientId,
              redirectURI,
              codeVerifierOrClientSecret
            )
          : verifyCodeGrant(code, client.clientId, redirectURI))

        if (!grant) {
          setError(ErrorCodes.INVALID_GRANT)
          return ErrorCodes.INVALID_GRANT
        } else if (
          !("codeChallenge" in grant) &&
          client.clientSecret !== codeVerifierOrClientSecret
        ) {
          setError(ErrorCodes.INVALID_CLIENT)
          return ErrorCodes.INVALID_CLIENT
        }
        const resourceOwner = await ResourceOwner.get(grant.userID)
        if (!resourceOwner) {
          setError(ErrorCodes.SERVER_ERROR)
          return ErrorCodes.SERVER_ERROR
        }
        await revokeGrant(grant.jti)
        return this.generateAccessRefreshTokenPair(
          client,
          resourceOwner,
          grant.scope
        )
      }
    )
  }

  private async exchangeRefreshToken(
    refreshToken: RefreshToken,
    client: Client,
    clientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeRefreshToken",
      async (span, setError) => {
        span.setAttributes({
          refreshToken: refreshToken.jti,
          client: client.id,
        })

        if (client.type === "confidential" && !clientSecret) {
          setError(ErrorCodes.INVALID_REQUEST)
          return ErrorCodes.INVALID_REQUEST
        }
        // Revoke current token and return new pair
        const [, pair] = await Promise.all([
          RefreshToken.revoke(refreshToken.token),
          this.generateAccessRefreshTokenPair(
            refreshToken.client,
            refreshToken.resourceOwner,
            refreshToken.scope
          ),
        ])
        return pair
      }
    )
  }

  async exchangeToken(
    grantType: AuthorizationCodeGrantType,
    code: string,
    clientId: string,
    clientSecretOrCodeVerifier: string,
    redirectUri: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes>
  async exchangeToken(
    grantType: RefreshTokenGrantType,
    refreshToken: string,
    clientId: string,
    clientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes>
  async exchangeToken(
    grantType: GrantType,
    codeOrRefreshToken: string,
    clientId: string,
    clientSecretOrCodeVerifier?: string,
    redirectUri?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeToken",
      async (span, setError) => {
        span.setAttributes({
          grantType,
          clientId,
          redirectUri,
        })

        const client = await Client.getByClientID(clientId)
        if (!client) {
          setError(ErrorCodes.INVALID_CLIENT)
          return ErrorCodes.INVALID_CLIENT
        }
        if (grantType === "authorization_code") {
          if (!redirectUri) {
            setError(ErrorCodes.INVALID_REQUEST)
            return ErrorCodes.INVALID_REQUEST
          }
          return this.exchangeAuthorizationCode(
            codeOrRefreshToken,
            client,
            redirectUri,
            clientSecretOrCodeVerifier
          )
        } else if (grantType === "refresh_token") {
          const refreshToken = await RefreshToken.verifyToken(
            codeOrRefreshToken
          )
          if (!refreshToken) {
            setError(ErrorCodes.INVALID_GRANT)
            return ErrorCodes.INVALID_GRANT
          }
          return this.exchangeRefreshToken(
            refreshToken,
            client,
            clientSecretOrCodeVerifier
          )
        } else {
          setError(ErrorCodes.UNSUPPORTED_GRANT_TYPE)
          return ErrorCodes.UNSUPPORTED_GRANT_TYPE
        }
      }
    )
  }

  async getJWKS() {
    return startActiveSpan("getJWKS", () => getJSONWebKeySet())
  }
}
