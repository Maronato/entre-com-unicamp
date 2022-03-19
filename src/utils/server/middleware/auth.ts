import { Scope } from "@/oauth/scope"

import {
  AuthenticatedAPIRequest,
  getRequestUser,
  hidrateAuthRequest,
} from "../auth"
import { Handler, respondUnauthorized } from "../serverUtils"
import { startActiveSpan } from "../telemetry/trace"

export const withAuthMiddleware =
  (handler: Handler, checkAudience?: boolean, scope?: Scope[]): Handler =>
  async (req, res) => {
    return startActiveSpan(`Middleware - withAuth`, async (span, setError) => {
      let authRequest: AuthenticatedAPIRequest
      try {
        authRequest = await hidrateAuthRequest(req, checkAudience, scope)
        const user = getRequestUser(authRequest)
        span.setAttribute("userID", user.id)
      } catch (e) {
        setError("Missing or invalid credentials")
        return respondUnauthorized(res, "Missing or invalid credentials")
      }
      await handler(authRequest, res)
    })
  }
