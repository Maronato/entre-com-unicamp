import { FunctionComponent } from "react"

import { GetServerSideProps, NextPage } from "next"
import { useRouter } from "next/router"

import Applications from "@/components/Applications"
import { serverFetch } from "@/utils/auth/server"
import { key, UserFallback, UserProvicer, useAuth } from "@/utils/hooks/useUser"

type Props = {
  fallback: UserFallback
}

const ProfilePage: FunctionComponent = () => {
  const { user, logout } = useAuth()
  const router = useRouter()
  if (!user) {
    router.push("/login")
  }

  return (
    <div className="flex flex-col">
      {`I'm a user: ${JSON.stringify(user)}`}
      <button onClick={() => logout()}>Logout</button>
      <div className="min-h-full flex items-center justify-center py-20 px-4">
        <Applications />
      </div>
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback }) => {
  return (
    <UserProvicer fallback={fallback}>
      <ProfilePage />
    </UserProvicer>
  )
}
export default Page

export const getServerSideProps: GetServerSideProps<Props> = async ({
  req,
}) => {
  const user = await serverFetch(req)

  if (!user[key]) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    }
  }

  return {
    props: {
      fallback: { ...user },
    },
  }
}
