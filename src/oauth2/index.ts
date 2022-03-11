import { getJSONWebKeySet } from "@/utils/jwk"

import { Client } from "./client"
import {
  AuthorizationCodeGrant,
  AuthorizationCodePKCEGrant,
  getGrant,
  CodeChallengeMethod,
} from "./grant"
import { ResourceOwner } from "./resourceOwner"
import { AccessToken, RefreshToken } from "./token"

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
  ): Promise<AuthorizationCodeGrant | string>
  async authorize(
    responseType: ResponseType,
    auth: PublicAuth,
    resourceOwnerId: string,
    redirectUri: string,
    scope?: string[],
    state?: string
  ): Promise<AuthorizationCodePKCEGrant | string>
  async authorize(
    responseType: ResponseType,
    auth: ConfidentialAuth | PublicAuth,
    resourceOwnerId: string,
    redirectUri: string,
    scope?: string[],
    state?: string
  ): Promise<AuthorizationCodeGrant | AuthorizationCodePKCEGrant | string> {
    const client = await Client.getByClientID(auth.clientId)
    if (!client || !client.redirectIsValid(redirectUri)) {
      return "INVALID_CLIENT_OR_REDIRECT_URI"
    }
    const resourceOwner = await ResourceOwner.get(resourceOwnerId)
    if (!resourceOwner) {
      return "INVALID_RESOURCE_OWNER"
    }
    if (responseType !== "code") {
      return "unsupported_response_type"
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
      return "invalid_request"
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

  private async generateAccessRefreshTokenPair(
    client: Client,
    resourceOwner: ResourceOwner,
    scope: string[]
  ): Promise<[AccessToken, RefreshToken]> {
    const accessToken = await AccessToken.create(client, resourceOwner, scope)
    const refreshToken = await RefreshToken.create(client, resourceOwner, scope)
    return [accessToken, refreshToken]
  }

  private async exchangeAuthorizationCode(
    grant: AuthorizationCodeGrant | AuthorizationCodePKCEGrant,
    client: Client,
    codeVerifierOrClientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | string> {
    console.log("exchanging")
    if ("codeChallenge" in grant) {
      if (!grant.check(codeVerifierOrClientSecret)) {
        return "invalid_grant"
      }
    } else if (client.clientSecret !== codeVerifierOrClientSecret) {
      return "invalid_client"
    }
    return this.generateAccessRefreshTokenPair(
      client,
      grant.resourceOwner,
      grant.scope
    )
  }

  private async exchangeRefreshToken(
    refreshToken: RefreshToken,
    client: Client,
    clientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | string> {
    if (client.type === "confidential" && !clientSecret) {
      return "invalid_request"
    }
    // Revoke current token
    await RefreshToken.revoke(refreshToken.token)
    return this.generateAccessRefreshTokenPair(
      refreshToken.client,
      refreshToken.resourceOwner,
      refreshToken.scope
    )
  }

  async exchangeToken(
    grantType: AuthorizationCodeGrantType,
    code: string,
    clientId: string,
    clientSecretOrCodeVerifier: string,
    redirectUri: string
  ): Promise<[AccessToken, RefreshToken] | string>
  async exchangeToken(
    grantType: RefreshTokenGrantType,
    refreshToken: string,
    clientId: string,
    clientSecret?: string
  ): Promise<[AccessToken, RefreshToken] | string>
  async exchangeToken(
    grantType: GrantType,
    codeOrRefreshToken: string,
    clientId: string,
    clientSecretOrCodeVerifier?: string,
    redirectUri?: string
  ): Promise<[AccessToken, RefreshToken] | string> {
    const client = await Client.getByClientID(clientId)
    if (!client) {
      return "invalid_client"
    }
    if (grantType === "authorization_code") {
      if (!redirectUri) {
        return "invalid_request"
      }
      const grant = await getGrant(client, codeOrRefreshToken)
      if (!grant || !grant.isValid(redirectUri)) {
        return "invalid_grant"
      }
      return this.exchangeAuthorizationCode(
        grant,
        client,
        clientSecretOrCodeVerifier
      )
    } else if (grantType === "refresh_token") {
      const refreshToken = await RefreshToken.verifyToken(codeOrRefreshToken)
      if (!refreshToken) {
        return "invalid_grant"
      }
      return this.exchangeRefreshToken(
        refreshToken,
        client,
        clientSecretOrCodeVerifier
      )
    } else {
      return "unsupported_grant_type"
    }
  }

  async getJWKS() {
    return await getJSONWebKeySet()
  }
}
