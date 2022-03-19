import { FunctionComponent } from "react"

import { GetServerSideProps, NextPage } from "next"

import Layout from "@/components/Layout"
import LogoTitle from "@/components/LogoTitle"
import { serverFetch } from "@/utils/auth/server"
import { UserFallback, UserProvicer } from "@/utils/hooks/useUser"

type Props = {
  fallback: UserFallback
}

const IndexPage: FunctionComponent = () => {
  return (
    <div className="flex flex-col m-10 p-10 border border-black dark:border-white">
      <LogoTitle />
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback, ...props }) => {
  return (
    <UserProvicer fallback={fallback}>
      <Layout>
        <IndexPage {...props} />
      </Layout>
    </UserProvicer>
  )
}
export default Page

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req,
}) => {
  const user = await serverFetch(req)

  return {
    props: {
      fallback: { ...user },
    },
  }
}
