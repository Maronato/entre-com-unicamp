import { JSONWebKeySet } from "jose"

import { Scope } from "@/oauth/scope"
import { ISSUER } from "@/utils/server/jwt"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withCORSAllowed } from "@/utils/server/middleware/cors"
import { respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JSONWebKeySet>
) {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
  const host = `${protocol}://${req.headers.host}` || "http://example.com"

  const authorization_endpoint = `${host}/oauth/authorize`
  const token_endpoint = `${host}/oauth/token`
  const userinfo_endpoint = `${host}/api/me`
  const jwks_uri = `${host}/.well-known/jwks.json`
  const registration_endpoint = `${host}/login`
  const service_documentation = `${host}/docs`

  res.setHeader("Content-Type", "application/json")
  const configuration = {
    issuer: ISSUER,
    authorization_endpoint,
    token_endpoint,
    userinfo_endpoint,
    jwks_uri,
    registration_endpoint,
    scopes_supported: Object.values(Scope),
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    claims_supported: [
      "aud",
      "sub",
      "iss",
      "jti",
      "type",
      "scope",
      "iat",
      "exp",
      "name",
      "email",
      "picture",
    ],
    service_documentation,
  }
  return respondOk(res, configuration)
}

export default withDefaultMiddleware(withCORSAllowed(handleRequest(handler)), [
  "GET",
])
