import { FunctionComponent, useState } from "react"

import { GetServerSideProps, NextPage } from "next"

import Avatar from "@/components/Avatar"
import Layout from "@/components/Layout"
import { UserFallback, UserProvicer } from "@/utils/browser/hooks/useUser"
import { serverFetch } from "@/utils/server/auth"

type Props = {
  fallback: UserFallback
}

const IndexPage: FunctionComponent = () => {
  const [message, setMessage] = useState("I'm an icon")

  return (
    <div className="flex flex-col m-10 p-10 border border-black dark:border-white">
      <input
        type="text"
        className="max-w-md p-3 rounded mb-5 text-black"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <Avatar name={message} className="w-64" />
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
