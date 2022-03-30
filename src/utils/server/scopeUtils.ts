import { NextApiRequest, NextApiResponse, NextApiHandler } from "next"

import { Scope } from "@/oauth/scope"

import { getRequestScope } from "./auth"
import { respondForbidden } from "./serverUtils"

const requireScope =
  (scope: Scope[]) =>
  (req: NextApiRequest, res: NextApiResponse, handler: NextApiHandler) => {
    const requestScope = getRequestScope(req)

    if (scope.every((s) => requestScope.includes(s))) {
      return handler(req, res)
    }

    return respondForbidden(res, "Missing scope")
  }

export const requireProfileWrite = requireScope([Scope.PROFILE_WRITE])
