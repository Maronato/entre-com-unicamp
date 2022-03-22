import { ExtendJWTPayload, ISSUER } from "@/utils/server/jwt"

import { Scope } from "../scope"

export type AccessTokenType = "access_token"
export type RefreshTokenType = "refresh_token"
export type LoginTokenType = "login_token"
export type TokenType = AccessTokenType | RefreshTokenType | LoginTokenType
export type AccessToken = string
export type RefreshToken = string
export type LoginToken = string
export type Token = AccessToken | RefreshToken | LoginToken

export type BaseTokenPayload = {
  type: TokenType
  scope: Scope[]
}

type BaseAccessTokenPayload = BaseTokenPayload & {
  type: AccessTokenType
  aud: string
  sub: string
}
export type AccessTokenPayload = ExtendJWTPayload<BaseAccessTokenPayload>

type BaseRefreshTokenPayload = BaseTokenPayload & {
  type: RefreshTokenType
  aud: string
  sub: string
}
export type RefreshTokenPayload = ExtendJWTPayload<BaseRefreshTokenPayload>

type BaseLoginTokenPayload = BaseTokenPayload & {
  type: LoginTokenType
  aud: typeof ISSUER
  sub: string
}
export type LoginTokenPayload = ExtendJWTPayload<BaseLoginTokenPayload>

export type TokenPayload =
  | AccessTokenPayload
  | RefreshTokenPayload
  | LoginTokenPayload
