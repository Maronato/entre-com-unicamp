import { serializeApp } from "@/oauth/app"
import { getAuthorizedApps } from "@/oauth/user"
import { getRequestUser } from "@/utils/server/auth"
import { handleRequest, withDefaultMiddleware } from "@/utils/server/middleware"
import { withAuthMiddleware } from "@/utils/server/middleware/auth"
import { respondOk } from "@/utils/server/serverUtils"

import type { NextApiRequest, NextApiResponse } from "next"

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = getRequestUser(req)
  const apps = await getAuthorizedApps(user.id)

  const resData = await Promise.all(
    apps
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
      .map((app) => serializeApp(app, false))
  )

  return respondOk(res, resData)
}

export default withDefaultMiddleware(
  withAuthMiddleware(handleRequest(handler)),
  ["GET"]
)
