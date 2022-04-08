import { ExtendJWTPayload, ISSUER } from "@/utils/server/jwt"

import { Scope } from "../scope"
import { User } from "../user"

export type AccessTokenType = "access_token"
type RefreshTokenType = "refresh_token"
type LoginTokenType = "login_token"
type IDTokenType = "id_token"
export type TokenType =
  | AccessTokenType
  | RefreshTokenType
  | LoginTokenType
  | IDTokenType
export type AccessToken = string
export type RefreshToken = string
type LoginToken = string
export type IDToken = string
export type Token = AccessToken | RefreshToken | LoginToken | IDToken

export type BaseTokenPayload = {
  type: TokenType
  scope: Scope[]
}

type BaseAccessTokenPayload = BaseTokenPayload & {
  type: AccessTokenType
  aud: typeof ISSUER
  sub: string
}
export type AccessTokenPayload = ExtendJWTPayload<BaseAccessTokenPayload>

type BaseRefreshTokenPayload = BaseTokenPayload & {
  type: RefreshTokenType
  aud: typeof ISSUER
  sub: string
}
export type RefreshTokenPayload = ExtendJWTPayload<BaseRefreshTokenPayload>

type BaseLoginTokenPayload = BaseTokenPayload & {
  type: LoginTokenType
  aud: typeof ISSUER
  sub: string
}
export type LoginTokenPayload = ExtendJWTPayload<BaseLoginTokenPayload>

type BaseIDTokenPayload = BaseTokenPayload &
  Pick<User, "name" | "picture" | "email" | "university_info"> & {
    type: IDTokenType
    aud: typeof ISSUER
    sub: string
    nonce?: string
  }
export type IDTokenPayload = ExtendJWTPayload<BaseIDTokenPayload>

export type TokenPayload =
  | AccessTokenPayload
  | RefreshTokenPayload
  | LoginTokenPayload
  | IDTokenPayload
