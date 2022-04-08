import { FunctionComponent } from "react"

import { GetServerSideProps, NextPage } from "next"
import { useRouter } from "next/router"

import Layout from "@/components/Layout"
import Login from "@/components/Login"
import Window from "@/components/Window"
import { useUser } from "@/utils/browser/hooks/useUser"
import { serverFetch } from "@/utils/server/auth"

type Props = Record<string, never>

const LoginPage: FunctionComponent = () => {
  const { user } = useUser()
  const router = useRouter()
  if (user) {
    router.replace("/profile")
    return null
  }
  return (
    <Window className="mx-auto mt-20">
      <Login />
    </Window>
  )
}

const Page: NextPage<Props> = ({ ...props }) => {
  return (
    <Layout title="Login">
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
