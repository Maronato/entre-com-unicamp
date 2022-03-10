import { SignJWT, jwtVerify, JWTPayload } from "jose"
import { Client } from "../client"
import { ALGORITHM, getJWKS, getPrivateKey } from "../../../utils/jwk"
import { ResourceOwner } from "../resourceOwner"
import { createRandomString } from "../../../utils/random"
import { getPrisma } from "../../../utils/db"

const issuer = "entre-com-unicamp.app"

export type AccessTokenType = "access_token"
export type RefreshTokenType = "refresh_token"
export type TokenType = AccessTokenType | RefreshTokenType

interface BaseTokenPayload {
  user: Pick<ResourceOwner, "email" | "id">
  type: TokenType
  scope: string[]
}

type TokenPayload = BaseTokenPayload & Required<Pick<JWTPayload, "iss" | "aud" | "iat" | "exp" | "jti">>

const createToken = (tokenType: TokenType, expirationTime: string | false) => async (client: Client, resourceOwner: ResourceOwner, scope: string[]) => {
  const payload: BaseTokenPayload = { user: { id: resourceOwner.id, email: resourceOwner.email }, type: tokenType, scope }
  let token = new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(client.clientId)
    .setJti(createRandomString(12))
  if (expirationTime) {
    token = token.setExpirationTime(expirationTime)
  }
  return token.sign(await getPrivateKey())
}

const createAccessToken = createToken("access_token", "2h")

const createRefreshToken = createToken("refresh_token", false)

const createTokenByType = (type: TokenType) => type === "access_token" ? createAccessToken : createRefreshToken

class Token {
  static type: TokenType
  token: string
  jti: string
  scope: string[]
  client: Client
  resourceOwner: ResourceOwner

  constructor(token: string, jti: string, client: Client, resourceOwner: ResourceOwner, scope: string[]) { 
    this.token = token
    this.jti = jti
    this.scope = scope
    this.client = client
    this.resourceOwner = resourceOwner
    
   }

   static async create<T extends typeof Token>(this: T, client: Client, resourceOwner: ResourceOwner, scope: string[]): Promise<InstanceType<T>> {
    const factory = createTokenByType(this.type)
    const tokenString = await factory(client, resourceOwner, scope)
    const token = await this.parseToken(tokenString)
    if (!token) {
      throw new Error("Error creating token")
    }
    return token
   }

   static async parseToken<T extends typeof Token>(this: T, token: string): Promise<InstanceType<T> | undefined> {
    const jwks = await getJWKS()
    try {
      const result = await jwtVerify(token, jwks, { algorithms: [ALGORITHM], issuer, typ: "JWT" })
      const { type, user, aud, scope, jti } = result.payload as unknown as TokenPayload
      if (type === this.type) {
        const resourceOwner = await ResourceOwner.get(user.id)
        if (resourceOwner) {
          const clientId = Array.isArray(aud) ? aud[0] : aud
          const client = await Client.getByClientID(clientId)
          if (client) {
            return new this(token, jti, client, resourceOwner, scope) as InstanceType<T>
          }
        }
      }
    } catch(e) {}
   }

   static async verifyToken<T extends typeof Token>(this: T, token: string): Promise<InstanceType<T> | undefined> {
    const tokenInstance = await this.parseToken(token)
    if (!tokenInstance) {
      return
    }
    const prisma = getPrisma()
    const revoked = await prisma.revoked_tokens.count({ where: { jti: tokenInstance.jti } })
    if (revoked > 0) {
      return
    }
    return tokenInstance
   }

   static async revoke(token: string) {
    const tokenInstance = await this.verifyToken(token)
    if (tokenInstance) {
      const prisma = getPrisma()
      await prisma.revoked_tokens.create({ data: { jti: tokenInstance.jti, type: this.type, client: BigInt(tokenInstance.client.id), resource_owner: BigInt(tokenInstance.resourceOwner.id) } })
    }
  }
}

export class AccessToken extends Token {
  static type: AccessTokenType = "access_token"
}

export class RefreshToken extends Token {
  static type: RefreshTokenType = "refresh_token"
}

export async function verifyToken(token: string) {
  let tokenInstance: AccessToken | RefreshToken | undefined = await AccessToken.verifyToken(token)
  if (!tokenInstance) {
    tokenInstance = await RefreshToken.verifyToken(token)
  }
  return tokenInstance
}
