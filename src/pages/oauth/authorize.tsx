import { FunctionComponent } from "react"

import { GetServerSideProps, NextPage } from "next"

import Authorize, { AuthorizeProps } from "@/components/Authorize"
import InvalidAuthorize from "@/components/InvalidAuthorize"
import Login from "@/components/Login"
import {
  App,
  getAppByClientID,
  serializeApp,
  SerializedApp,
} from "@/oauth2/app"
import { CodeChallengeMethod } from "@/oauth2/grant"
import { isScope, Scope } from "@/oauth2/scope"
import { serverFetch } from "@/utils/auth/server"
import { ErrorCodes } from "@/utils/errorCode"

import { UserFallback, UserProvicer, useAuth } from "../../utils/hooks/useUser"

type BaseProps = {
  fallback: UserFallback
}
type ValidProps = {
  query: AuthorizeProps
  app: SerializedApp
}
type ErrorProps = {
  error: string
}
type Props = BaseProps & (ValidProps | ErrorProps)

const AuthorizePage: FunctionComponent<ValidProps | ErrorProps> = (props) => {
  const { user, logout } = useAuth()

  if ("error" in props) {
    return <InvalidAuthorize error={props.error} />
  }

  return (
    <div className="flex flex-col">
      {`I'm a user: ${JSON.stringify(user)}`}
      <button onClick={() => logout()}>Logout</button>
      <div className="min-h-full flex items-center justify-center py-20 px-4">
        {!!user || <Login />}
        {!!user && <Authorize {...props.query} app={props.app} />}
      </div>
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback, ...props }) => {
  return (
    <UserProvicer fallback={fallback}>
      <AuthorizePage {...props} />
    </UserProvicer>
  )
}
export default Page

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req,
  query,
}) => {
  const user = await serverFetch(req)

  const {
    response_type,
    client_id,
    code_challenge,
    code_challenge_method,
    redirect_uri,
    scope,
    state,
  } = query

  let app: App | null

  if (
    !client_id ||
    !redirect_uri ||
    Array.isArray(client_id) ||
    Array.isArray(redirect_uri) ||
    !(app = await getAppByClientID(client_id))?.redirect_uris.includes(
      redirect_uri
    )
  ) {
    return {
      props: { fallback: { ...user }, error: "invalid_client" },
    }
  }

  const redirectUrl = new URL(redirect_uri)
  const respondRedirect = () => ({
    redirect: {
      destination: redirectUrl.href,
      statusCode: 302 as const,
    },
  })

  if (state && !Array.isArray(state)) {
    redirectUrl.searchParams.append("state", state)
  }

  if (
    !response_type ||
    Array.isArray(code_challenge) ||
    Array.isArray(code_challenge_method) ||
    Array.isArray(state)
  ) {
    redirectUrl.searchParams.append("error", ErrorCodes.INVALID_REQUEST)
    return respondRedirect()
  }

  if (response_type !== "code") {
    redirectUrl.searchParams.append(
      "error",
      ErrorCodes.UNSUPPORTED_RESPONSE_TYPE
    )
    return respondRedirect()
  }

  const authQuery: Partial<AuthorizeProps> = {
    clientID: client_id,
    redirectUri: redirect_uri,
  }
  const scopeArr = scope
    ? Array.isArray(scope)
      ? scope
      : scope.split(" ")
    : [Scope.APPS_READ]

  if (!scopeArr.every(isScope)) {
    redirectUrl.searchParams.append("error", ErrorCodes.INVALID_SCOPE)
    return respondRedirect()
  }
  if (!scopeArr.every((s) => app?.scope.includes(s))) {
    redirectUrl.searchParams.append("error", ErrorCodes.INVALID_SCOPE)
    return respondRedirect()
  }

  if (code_challenge) {
    authQuery.codeChallenge = code_challenge
  }
  if (code_challenge_method) {
    authQuery.codeChallengeMethod = code_challenge_method as CodeChallengeMethod
  }
  if (state) {
    authQuery.state = state
  }

  const serializedApp = await serializeApp(app)

  return {
    props: {
      fallback: { ...user },
      query: authQuery as AuthorizeProps,
      app: serializedApp,
    },
  }
}
