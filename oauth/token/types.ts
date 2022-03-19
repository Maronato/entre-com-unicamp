import { ExtendJWTPayload } from "@/utils/server/jwt"

import { Scope } from "../scope"
import { User } from "../user"

export type AccessTokenType = "access_token"
export type RefreshTokenType = "refresh_token"
export type TokenType = AccessTokenType | RefreshTokenType
export type AccessToken = string
export type RefreshToken = string
export type Token = AccessToken | RefreshToken

export type BaseTokenPayload = {
  user: Omit<User, "id"> & { id: string }
  type: TokenType
  scope: Scope[]
}

type BaseAccessTokenPayload = BaseTokenPayload & {
  type: AccessTokenType
  aud: string
}
export type AccessTokenPayload = ExtendJWTPayload<BaseAccessTokenPayload>

type BaseRefreshTokenPayload = BaseTokenPayload & {
  type: RefreshTokenType
  aud: string
}
export type RefreshTokenPayload = ExtendJWTPayload<BaseRefreshTokenPayload>

export type TokenPayload = AccessTokenPayload | RefreshTokenPayload
