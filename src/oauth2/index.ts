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
import { asUser, ResourceOwner, User } from "./resourceOwner"
import {
  createAccessToken,
  createRefreshToken,
  verifyToken,
  AccessToken,
  RefreshToken,
  RefreshTokenPayload,
  parseToken,
  rotateRefreshToken,
} from "./token"

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
            asUser(resourceOwner).id,
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
          asUser(resourceOwner).id,
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
    user: User,
    scope: string[],
    previousJTI?: string
  ): Promise<[AccessToken, RefreshToken]> {
    return startActiveSpan(
      "AuthorizationServer.generateAccessRefreshTokenPair",
      async (span) => {
        span.setAttributes({
          client: client.id,
          user: user.id.toString(),
          scope,
        })
        if (!previousJTI) {
          return Promise.all([
            createAccessToken(client.clientId, user, scope),
            createRefreshToken(client.clientId, user, scope),
          ])
        }
        return Promise.all([
          createAccessToken(client.clientId, user, scope),
          rotateRefreshToken(previousJTI, client.clientId, user, scope),
        ])
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
        const resourceOwner = await ResourceOwner.get(grant.userID.toString())
        if (!resourceOwner) {
          setError(ErrorCodes.SERVER_ERROR)
          return ErrorCodes.SERVER_ERROR
        }
        const [pair] = await Promise.all([
          this.generateAccessRefreshTokenPair(
            client,
            asUser(resourceOwner),
            grant.scope
          ),
          revokeGrant(grant.jti),
        ])
        return pair
      }
    )
  }

  private async exchangeRefreshToken(
    refreshToken: RefreshTokenPayload,
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
        return this.generateAccessRefreshTokenPair(
          client,
          {
            email: refreshToken.user.email,
            id: BigInt(refreshToken.user.id),
          },
          refreshToken.scope,
          refreshToken.jti
        )
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
          // Typeguard that saves us a type check later
          const guardRefreshTokenType = <T>(
            token: T,
            check: boolean
          ): token is NonNullable<T> => check

          const refreshToken = await parseToken<
            RefreshToken,
            RefreshTokenPayload
          >(codeOrRefreshToken)
          const isValid = await verifyToken(codeOrRefreshToken, "refresh_token")

          if (!guardRefreshTokenType(refreshToken, isValid)) {
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
