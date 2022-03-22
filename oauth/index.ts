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
import { REQUIRED_SCOPE, Scope } from "./scope"
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
import { authorizeApp, getUser, User } from "./user"

export const isErrorCode = (value: unknown): value is ErrorCodes =>
  typeof value === "string" &&
  Object.values(ErrorCodes).includes(value as ErrorCodes)

type ResponseType = "code"
export type AuthorizationCodeGrantType = "authorization_code"
export type RefreshTokenGrantType = "refresh_token"
export type GrantType = AuthorizationCodeGrantType | RefreshTokenGrantType

type ConfidentialAuth = {
  clientID: App["client_id"]
}

type PublicAuth = {
  clientID: App["client_id"]
  codeChallenge: string
  codeChallengeMethod: CodeChallengeMethod
}
export class AuthorizationServer {
  async authorize(
    responseType: ResponseType,
    auth: ConfidentialAuth,
    userID: User["id"],
    redirectURI: string,
    scope?: Scope[],
    state?: string
  ): Promise<AuthorizationCodeGrant | ErrorCodes>
  async authorize(
    responseType: ResponseType,
    auth: PublicAuth,
    userID: User["id"],
    redirectURI: string,
    scope?: Scope[],
    state?: string
  ): Promise<AuthorizationCodeGrant | ErrorCodes>
  async authorize(
    responseType: ResponseType,
    auth: ConfidentialAuth | PublicAuth,
    userID: User["id"],
    redirectURI: string,
    scope?: Scope[],
    state?: string
  ): Promise<AuthorizationCodeGrant | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.authorize",
      async (span, setError) => {
        span.setAttributes({
          responseType,
          clientID: auth.clientID,
          userID: userID,
          redirectURI,
          scope,
          state,
        })

        const app = await getAppByClientID(auth.clientID)
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

        scope = scope ?? REQUIRED_SCOPE

        if (!scope.every((s) => app.scope.includes(s))) {
          setError(ErrorCodes.INVALID_SCOPE)
          return ErrorCodes.INVALID_SCOPE
        }
        if (app.type === "confidential") {
          return createCodeGrant(
            app.client_id,
            user.id,
            scope,
            redirectURI,
            state
          )
        }
        if (!("codeChallenge" in auth)) {
          setError(ErrorCodes.INVALID_REQUEST)
          return ErrorCodes.INVALID_REQUEST
        }

        // User has authorized app
        await authorizeApp(user.id, app.id)

        return createCodeGrant(
          auth.clientID,
          user.id,
          scope,
          redirectURI,
          auth.codeChallenge,
          auth.codeChallengeMethod,
          state
        )
      }
    )
  }

  private async generateAccessRefreshTokenPair(
    app: Pick<App, "client_id">,
    user: Pick<User, "id">,
    scope: Scope[],
    previousJTI?: string
  ): Promise<[AccessToken, RefreshToken]> {
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
          ])
        }
        return Promise.all([
          createAccessToken(app.client_id, user, scope),
          rotateRefreshToken(previousJTI, app.client_id, user, scope),
        ])
      }
    )
  }

  private async exchangeAuthorizationCode(
    code: string,
    app: App,
    redirectURI: string,
    codeVerifierOrClientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeAuthorizationCode",
      async (span, setError) => {
        span.setAttributes({
          code,
          app: app.client_id,
        })

        const grant = await (codeVerifierOrClientSecret
          ? verifyCodeGrant(
              code,
              app.client_id,
              redirectURI,
              codeVerifierOrClientSecret
            )
          : verifyCodeGrant(code, app.client_id, redirectURI))

        if (!grant) {
          setError(ErrorCodes.INVALID_GRANT)
          return ErrorCodes.INVALID_GRANT
        } else if (
          !("codeChallenge" in grant) &&
          app.client_secret !== codeVerifierOrClientSecret
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
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes> {
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
    grantType: AuthorizationCodeGrantType,
    code: string,
    clientID: string,
    clientSecretOrCodeVerifier: string,
    redirectURI: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes>
  async exchangeToken(
    grantType: RefreshTokenGrantType,
    refreshToken: string,
    clientID: string,
    clientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes>
  async exchangeToken(
    grantType: GrantType,
    codeOrRefreshToken: string,
    clientID: string,
    clientSecretOrCodeVerifier?: string,
    redirectURI?: string
  ): Promise<[AccessToken, RefreshToken] | ErrorCodes> {
    return startActiveSpan(
      "AuthorizationServer.exchangeToken",
      async (span, setError) => {
        span.setAttributes({
          grantType,
          clientID,
          redirectURI,
        })

        const app = await getAppByClientID(clientID)
        if (!app) {
          setError(ErrorCodes.INVALID_CLIENT)
          return ErrorCodes.INVALID_CLIENT
        }
        if (grantType === "authorization_code") {
          if (!redirectURI) {
            setError(ErrorCodes.INVALID_REQUEST)
            return ErrorCodes.INVALID_REQUEST
          }
          return this.exchangeAuthorizationCode(
            codeOrRefreshToken,
            app,
            redirectURI,
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
          const isValid = await validateToken(codeOrRefreshToken, {
            type: "refresh_token",
          })

          if (!guardRefreshTokenType(refreshToken, isValid)) {
            setError(ErrorCodes.INVALID_GRANT)
            return ErrorCodes.INVALID_GRANT
          }
          return this.exchangeRefreshToken(
            refreshToken,
            app,
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
