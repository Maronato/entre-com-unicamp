import { Scope } from "@/oauth/scope"
import {
  deleteUser,
  SerializedUser,
  serializeUser,
  updateUser,
  User,
} from "@/oauth/user"
import { getRequestUser, getRequestScope } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import { requireProfileWrite } from "@/utils/server/scopeUtils"
import {
  respondMethodNotAllowed,
  respondNoContent,
  respondOk,
} from "@/utils/server/serverUtils"

import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next"

type ResponseData = SerializedUser

async function handleGET(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | string>
) {
  const user = getRequestUser(req)
  const scope = getRequestScope(req)

  if (scope.includes(Scope.APPS_READ)) {
    return respondOk(res, serializeUser(user, true))
  }
  return respondOk(res, serializeUser(user))
}

const handlePATCH: NextApiHandler = async (req, res) => {
  const user = getRequestUser(req)

  const { name, avatar } = req.body as Partial<Pick<User, "name" | "avatar">>

  const updated = await updateUser(user, { name, avatar })

  return respondOk(res, serializeUser(updated))
}

const handleDelete: NextApiHandler = async (req, res) => {
  const user = getRequestUser(req)
  await deleteUser(user)
  return respondNoContent(res)
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      return handleGET(req, res)
    case "PATCH":
      return requireProfileWrite(req, res, handlePATCH)
    case "DELETE":
      return requireProfileWrite(req, res, handleDelete)
    default:
      return respondMethodNotAllowed(res)
  }
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler), false),
  ["GET", "PATCH", "DELETE"]
)
