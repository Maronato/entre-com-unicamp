import { getJSONWebKeySet } from "@/utils/jwk"
import { startActiveSpan } from "@/utils/telemetry/trace"

import { Client } from "./client"
import {
  AuthorizationCodeGrant,
  AuthorizationCodePKCEGrant,
  getGrant,
  CodeChallengeMethod,
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
}

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
  ): Promise<AuthorizationCodePKCEGrant | ErrorCodes>
  async authorize(
    responseType: ResponseType,
    auth: ConfidentialAuth | PublicAuth,
    resourceOwnerId: string,
    redirectUri: string,
    scope?: string[],
    state?: string
  ): Promise<AuthorizationCodeGrant | AuthorizationCodePKCEGrant | ErrorCodes> {
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
          return AuthorizationCodeGrant.create(
            client,
            resourceOwner,
            scope,
            redirectUri,
            state
          )
        }
        if (!("codeChallenge" in auth)) {
          setError(ErrorCodes.INVALID_REQUEST)
          return ErrorCodes.INVALID_REQUEST
        }
        return AuthorizationCodePKCEGrant.create(
          client,
          resourceOwner,
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
    grant: AuthorizationCodeGrant | AuthorizationCodePKCEGrant,
    client: Client,
    codeVerifierOrClientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeAuthorizationCode",
      async (span, setError) => {
        span.setAttributes({
          grant: grant.id,
          client: client.id,
        })

        if ("codeChallenge" in grant) {
          if (!grant.check(codeVerifierOrClientSecret)) {
            setError(ErrorCodes.INVALID_GRANT)
            return ErrorCodes.INVALID_GRANT
          }
        } else if (client.clientSecret !== codeVerifierOrClientSecret) {
          setError(ErrorCodes.INVALID_CLIENT)
          return ErrorCodes.INVALID_CLIENT
        }
        return this.generateAccessRefreshTokenPair(
          client,
          grant.resourceOwner,
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
          const grant = await getGrant(client, codeOrRefreshToken)
          if (!grant || !grant.isValid(redirectUri)) {
            setError(ErrorCodes.INVALID_GRANT)
            return ErrorCodes.INVALID_GRANT
          }
          return this.exchangeAuthorizationCode(
            grant,
            client,
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
