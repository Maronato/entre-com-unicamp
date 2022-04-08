import { FunctionComponent } from "react"

import { SerializedApp } from "@/oauth/app/types"
import { RequestData } from "@/pages/api/oauth/authorize"
import { useAuth } from "@/utils/browser/hooks/useUser"

import Login from "../Login"

import Frame from "./Frame"
import UserAuthorization from "./UserAuthorization"

export type AuthorizeProps = Omit<RequestData, "responseType">

const Authorize: FunctionComponent<AuthorizeProps & { app: SerializedApp }> = ({
  app,
  ...props
}) => {
  const { user } = useAuth()

  return (
    <Frame app={app}>
      {!!user || <Login />}
      {!!user && <UserAuthorization app={app} {...props} />}
    </Frame>
  )
}

export default Authorize
