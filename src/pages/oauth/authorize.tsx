import { FunctionComponent } from "react"

import { GetServerSideProps, NextPage } from "next"

import Authorize, { AuthorizeProps, ClientData } from "@/components/Authorize"
import InvalidAuthorize from "@/components/InvalidAuthorize"
import Login from "@/components/Login"
import { Client } from "@/oauth2/client"
import { CodeChallengeMethod } from "@/oauth2/grant"
import { serverFetch } from "@/utils/auth/server"

import { UserFallback, UserProvicer, useAuth } from "../../utils/hooks/useUser"

type BaseProps = {
  fallback: UserFallback
}
type ValidProps = {
  query: AuthorizeProps
  client: ClientData
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
        {!!user && <Authorize {...props.query} client={props.client} />}
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

  let client: Client | undefined

  if (
    !client_id ||
    !redirect_uri ||
    Array.isArray(client_id) ||
    Array.isArray(redirect_uri) ||
    !(client = await Client.getByClientID(client_id))?.redirectIsValid(
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
    redirectUrl.searchParams.append("error", "invalid_request")
    return respondRedirect()
  }

  if (response_type !== "code") {
    redirectUrl.searchParams.append("error", "unsupported_response_type")
    return respondRedirect()
  }

  const authQuery: Partial<AuthorizeProps> = {
    clientId: client_id,
    redirectUri: redirect_uri,
  }
  if (scope) {
    authQuery.scope = Array.isArray(scope) ? scope : [scope]
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

  return {
    props: {
      fallback: { ...user },
      query: authQuery as AuthorizeProps,
      client: client.toJSON() as ClientData,
    },
  }
}
