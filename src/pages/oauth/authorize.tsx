import { FunctionComponent, useState } from "react"

import { GetServerSideProps, NextPage } from "next"

import {
  serverFetch,
  UserFallback,
  UserProvicer,
  useAuth,
} from "../../utils/auth/useUser"

interface Props {
  fallback: UserFallback
}

const Authorize: FunctionComponent = () => {
  const { user, sendEmailCode, login, logout } = useAuth()
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  return (
    <div>
      {`I'm a user: ${JSON.stringify(user)}`}
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input value={code} onChange={(e) => setCode(e.target.value)} />
      <button onClick={() => sendEmailCode(email)}>Send email code</button>
      <button onClick={() => login(email, code)}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback, ...props }) => {
  return (
    <UserProvicer fallback={fallback}>
      <Authorize {...props} />
    </UserProvicer>
  )
}
export default Page

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req,
}) => {
  const user = await serverFetch(req)
  return { props: { fallback: { ...user } } }
}
