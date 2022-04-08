import { ErrorCodes } from "@/utils/common/errorCode"
import { getJSONWebKeySet } from "@/utils/server/jwt"
import { startActiveSpan } from "@/utils/server/telemetry/trace"

import { getAppByClientID } from "./app"
import { App } from "./app/types"
import {
  createCodeGrant,
  AuthorizationCodeGrant,
  verifyCodeGrant,
  CodeChallengeMethod,
  revokeGrant,
} from "./grant"
import { Scope } from "./scope"
import {
  createAccessToken,
  createRefreshToken,
  validateToken,
  AccessToken,
  RefreshToken,
  RefreshTokenPayload,
  parseToken,
  rotateRefreshToken,
} from "./token"
import { createIDToken } from "./token/create"
import { IDToken } from "./token/types"
import { getUser, User } from "./user"

export const isErrorCode = (value: unknown): value is ErrorCodes =>
  typeof value === "string" &&
  Object.values(ErrorCodes).includes(value as ErrorCodes)

type ResponseType = "code"
export type AuthorizationCodeGrantType = "authorization_code"
type RefreshTokenGrantType = "refresh_token"
export type GrantType = AuthorizationCodeGrantType | RefreshTokenGrantType

type MaybeIDToken = IDToken | undefined

type ExchangeAccessTokenRequest = {
  grantType: AuthorizationCodeGrantType
  code: string
  clientID: string
  redirectURI: string
  clientSecret?: string
  codeVerifier?: string
}

type ExchangeRefreshTokenRequest = {
  grantType: RefreshTokenGrantType
  refreshToken: string
  clientID: string
  clientSecret?: string
}

type AuthorizationRequest = {
  responseType: ResponseType
  userID: User["id"]
  clientID: string
  redirectURI: string
  scope: Scope[]
  state?: string
  nonce?: string
  codeChallenge?: string
  codeChallengeMethod?: CodeChallengeMethod
}

export class AuthorizationServer {
  async authorize({
    userID,
    clientID,
    redirectURI,
    responseType,
    codeChallenge,
    codeChallengeMethod,
    nonce,
    scope,
    state,
  }: AuthorizationRequest): Promise<AuthorizationCodeGrant | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.authorize",
      async (span, setError) => {
        span.setAttributes({
          responseType,
          clientID,
          userID,
          redirectURI,
          scope,
          state,
          nonce,
        })

        const app = await getAppByClientID(clientID)
        if (!app || !app.redirect_uris.includes(redirectURI)) {
          setError(ErrorCodes.INVALID_CLIENT_OR_REDIRECT_URI)
          return ErrorCodes.INVALID_CLIENT_OR_REDIRECT_URI
        }
        const user = await getUser(userID)
        if (!user) {
          setError(ErrorCodes.INVALID_RESOURCE_OWNER)
          return ErrorCodes.INVALID_RESOURCE_OWNER
        }
        if (responseType !== "code") {
          setError(ErrorCodes.UNSUPPORTED_RESPONSE_TYPE)
          return ErrorCodes.UNSUPPORTED_RESPONSE_TYPE
        }

        if (!scope.every((s) => app.scope.includes(s))) {
          setError(ErrorCodes.INVALID_SCOPE)
          return ErrorCodes.INVALID_SCOPE
        }

        // Public must not have codeChallenge
        if (app.type === "public" && !(codeChallenge && codeChallengeMethod)) {
          setError(ErrorCodes.INVALID_REQUEST)
          return ErrorCodes.INVALID_REQUEST
        }

        if (codeChallenge || codeChallengeMethod) {
          if (!(codeChallenge && codeChallengeMethod)) {
            setError(ErrorCodes.INVALID_REQUEST)
            return ErrorCodes.INVALID_REQUEST
          }
          return createCodeGrant(
            clientID,
            user.id,
            scope,
            redirectURI,
            codeChallenge,
            codeChallengeMethod,
            { state, nonce }
          )
        }

        return createCodeGrant(clientID, user.id, scope, redirectURI, {
          state,
          nonce,
        })
      }
    )
  }

  private async generateAccessRefreshTokenPair(
    app: Pick<App, "client_id">,
    user: Pick<User, "id">,
    scope: Scope[],
    previousJTI?: string
  ): Promise<[AccessToken, RefreshToken, MaybeIDToken]> {
    return startActiveSpan(
      "AuthorizationServer.generateAccessRefreshTokenPair",
      async (span) => {
        span.setAttributes({
          app: app.client_id,
          user: user.id,
          scope,
        })
        if (!previousJTI) {
          return Promise.all([
            createAccessToken(app.client_id, user, scope),
            createRefreshToken(app.client_id, user, scope),
            createIDToken(app.client_id, user, scope),
          ])
        }
        return Promise.all([
          createAccessToken(app.client_id, user, scope),
          rotateRefreshToken(previousJTI, app.client_id, user, scope),
          createIDToken(app.client_id, user, scope),
        ])
      }
    )
  }

  private async exchangeAuthorizationCode(
    app: App,
    {
      code,
      redirectURI,
      clientSecret,
      codeVerifier,
    }: Omit<ExchangeAccessTokenRequest, "clientID" | "grantType">
  ): Promise<[AccessToken, RefreshToken, MaybeIDToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeAuthorizationCode",
      async (span, setError) => {
        span.setAttributes({
          code,
          app: app.client_id,
        })

        const grant = await (codeVerifier
          ? verifyCodeGrant(code, app.client_id, redirectURI, codeVerifier)
          : verifyCodeGrant(code, app.client_id, redirectURI))

        if (!grant) {
          setError(ErrorCodes.INVALID_GRANT)
          return ErrorCodes.INVALID_GRANT
        } else if (
          (!("codeChallenge" in grant) || clientSecret) &&
          app.client_secret !== clientSecret
        ) {
          setError(ErrorCodes.INVALID_CLIENT)
          return ErrorCodes.INVALID_CLIENT
        }
        const user = await getUser(grant.sub)
        if (!user) {
          setError(ErrorCodes.SERVER_ERROR)
          return ErrorCodes.SERVER_ERROR
        }
        const [pair] = await Promise.all([
          this.generateAccessRefreshTokenPair(app, user, grant.scope),
          revokeGrant(grant.jti),
        ])
        return pair
      }
    )
  }

  private async exchangeRefreshToken(
    refreshToken: RefreshTokenPayload,
    app: App,
    clientSecret?: string
  ): Promise<[AccessToken, RefreshToken, MaybeIDToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeRefreshToken",
      async (span, setError) => {
        span.setAttributes({
          refreshToken: refreshToken.jti,
          app: app.client_id,
        })

        if (app.type === "confidential" && !clientSecret) {
          setError(ErrorCodes.INVALID_REQUEST)
          return ErrorCodes.INVALID_REQUEST
        }
        return this.generateAccessRefreshTokenPair(
          app,
          {
            id: refreshToken.sub,
          },
          refreshToken.scope,
          refreshToken.jti
        )
      }
    )
  }

  async exchangeToken(
    payload: ExchangeAccessTokenRequest | ExchangeRefreshTokenRequest
  ): Promise<[AccessToken, RefreshToken, MaybeIDToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeToken",
      async (span, setError) => {
        span.setAttributes({
          grantType: payload.grantType,
          clientID: payload.clientID,
        })

        const app = await getAppByClientID(payload.clientID)
        if (!app) {
          setError(ErrorCodes.INVALID_CLIENT)
          return ErrorCodes.INVALID_CLIENT
        }
        if (payload.grantType === "authorization_code") {
          return this.exchangeAuthorizationCode(app, payload)
        } else if (payload.grantType === "refresh_token") {
          // Typeguard that saves us a type check later
          const guardRefreshTokenType = <T>(
            token: T,
            check: boolean
          ): token is NonNullable<T> => check

          const refreshToken = await parseToken<
            RefreshToken,
            RefreshTokenPayload
          >(payload.refreshToken)
          const isValid = await validateToken(payload.refreshToken, {
            types: ["refresh_token"],
          })

          if (!guardRefreshTokenType(refreshToken, isValid)) {
            setError(ErrorCodes.INVALID_GRANT)
            return ErrorCodes.INVALID_GRANT
          }
          return this.exchangeRefreshToken(
            refreshToken,
            app,
            payload.clientSecret
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
