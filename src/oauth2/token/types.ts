import { ExtendJWTPayload } from "@/utils/jwt"

import { User } from "../resourceOwner"

export type AccessTokenType = "access_token"
export type RefreshTokenType = "refresh_token"
export type TokenType = AccessTokenType | RefreshTokenType
export type AccessToken = string
export type RefreshToken = string
export type Token = AccessToken | RefreshToken

export type BaseTokenPayload = {
  user: Omit<User, "id"> & { id: string }
  type: TokenType
  scope: string[]
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
