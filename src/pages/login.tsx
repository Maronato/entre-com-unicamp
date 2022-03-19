import { FunctionComponent } from "react"

import { GetServerSideProps, NextPage } from "next"
import { useRouter } from "next/router"

import Layout from "@/components/Layout"
import Login from "@/components/Login"
import { serverFetch } from "@/utils/auth/server"
import { useUser } from "@/utils/hooks/useUser"

type Props = Record<string, never>

const LoginPage: FunctionComponent = () => {
  const { user } = useUser()
  const router = useRouter()
  if (user) {
    router.replace("/profile")
    return null
  }
  return (
    <div>
      <Login />
    </div>
  )
}

const Page: NextPage<Props> = ({ ...props }) => {
  return (
    <Layout>
      <LoginPage {...props} />
    </Layout>
  )
}
export default Page

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req,
}) => {
  const { user } = await serverFetch(req)

  if (user) {
    return {
      redirect: {
        destination: "/profile",
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}
