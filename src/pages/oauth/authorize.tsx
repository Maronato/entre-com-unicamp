import { FunctionComponent } from "react"

import { GetServerSideProps, NextPage } from "next"

import Authorize, { AuthorizeProps } from "@/components/Authorize"
import InvalidAuthorize from "@/components/InvalidAuthorize"
import Layout from "@/components/Layout"
import { getAppByClientID, serializeApp } from "@/oauth/app"
import { App, SerializedApp } from "@/oauth/app/types"
import { CodeChallengeMethod } from "@/oauth/grant"
import { isScope, REQUIRED_SCOPE } from "@/oauth/scope"
import { ErrorCodes } from "@/utils/common/errorCode"
import { serverFetch } from "@/utils/server/auth"

import { UserFallback, UserProvicer } from "../../utils/browser/hooks/useUser"

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
  if ("error" in props) {
    return <InvalidAuthorize error={props.error} />
  }

  return (
    <div className="w-full flex items-center justify-center">
      <Authorize {...props.query} app={props.app} />
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback, ...props }) => {
  const title = "error" in props ? props.error : `Autorizar ${props.app.name}`
  return (
    <UserProvicer fallback={fallback}>
      <Layout title={title}>
        <AuthorizePage {...props} />
      </Layout>
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
    nonce,
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
    Array.isArray(state) ||
    Array.isArray(nonce)
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

  const scopeArr = scope
    ? Array.isArray(scope)
      ? scope
      : scope.split(" ")
    : REQUIRED_SCOPE

  if (!scopeArr.every(isScope)) {
    redirectUrl.searchParams.append("error", ErrorCodes.INVALID_SCOPE)
    return respondRedirect()
  }
  if (!scopeArr.every((s) => app?.scope.includes(s))) {
    redirectUrl.searchParams.append("error", ErrorCodes.INVALID_SCOPE)
    return respondRedirect()
  }
  // Remove then add at the beginnig
  REQUIRED_SCOPE.forEach((s) => {
    if (scopeArr.includes(s)) {
      scopeArr.splice(scopeArr.indexOf(s), 1)
    }
  })
  scopeArr.unshift(...REQUIRED_SCOPE)

  const authQuery: Partial<AuthorizeProps> = {
    clientID: client_id,
    redirectURI: redirect_uri,
    scope: scopeArr,
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
  if (nonce) {
    authQuery.nonce = nonce
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
