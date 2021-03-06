import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { Tab } from "@headlessui/react"
import {
  CodeIcon,
  UserIcon,
  CogIcon,
  PuzzleIcon,
} from "@heroicons/react/outline"
import classNames from "classnames"
import { GetServerSideProps, NextPage } from "next"
import { useRouter } from "next/router"

import Layout from "@/components/Layout"
import AccountTab from "@/components/ProfilePage/AccountTab"
import AppsTab from "@/components/ProfilePage/AppsTab"
import DeveloperTab from "@/components/ProfilePage/DeveloperTab"
import ProfileTab from "@/components/ProfilePage/ProfileTab"
import {
  key,
  UserFallback,
  UserProvicer,
  useAuth,
} from "@/utils/browser/hooks/useUser"
import { serverFetch } from "@/utils/server/auth"

type Props = {
  fallback: UserFallback
}

const ProfilePage: FunctionComponent = () => {
  const { user } = useAuth()
  const router = useRouter()

  const [selectedIndex, setSelectedIndex] = useState(0)

  const tabs = useMemo<
    {
      name: string
      hash: string
      icon: typeof CodeIcon
      panel: FunctionComponent
    }[]
  >(
    () => [
      { name: "Perfil", hash: "", icon: UserIcon, panel: ProfileTab },
      { name: "Aplicativos", hash: "#apps", icon: PuzzleIcon, panel: AppsTab },
      { name: "Conta", hash: "#account", icon: CogIcon, panel: AccountTab },
      {
        name: "Desenvolvedor",
        hash: "#developer",
        icon: CodeIcon,
        panel: DeveloperTab,
      },
    ],
    []
  )

  const changeTab = useCallback(
    (tabHash: string) => {
      const hash = new URL(tabHash, "http://example.com").hash
      if (location.hash !== hash) {
        location.hash = hash
      }
      let idx = tabs.findIndex((t) => t.hash === hash)
      idx = idx >= 0 ? idx : 0

      setSelectedIndex(idx)
    },
    [tabs]
  )

  useEffect(() => {
    changeTab(location.hash)
    router.events.on("hashChangeComplete", changeTab)
    return () => router.events.off("hashChangeComplete", changeTab)
  }, [changeTab, router.events])

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-8 max-w-3xl mx-auto">
      <Tab.Group
        vertical
        selectedIndex={selectedIndex}
        onChange={(i) => changeTab(tabs[i].hash)}>
        <Tab.List className="w-full flex flex-col p-1 space-y-4 bg-background-light dark:bg-background-dark rounded-xl col-span-2 h-min">
          {tabs.map((tab) => (
            <Tab
              key={tab.hash}
              className={({ selected }) =>
                classNames(
                  "w-full py-2.5 px-4 text-sm leading-5 font-medium text-black dark:text-white rounded-lg transition-all duration-200 text-left",
                  selected
                    ? "bg-background-dark/[0.05] dark:bg-background-light/[0.2] shadow"
                    : "hover:bg-background-dark/[0.1] hover:dark:bg-background-light/[0.1]"
                )
              }>
              <div className="flex flex-row items-center space-x-3">
                <tab.icon className="w-4 h-4 text-current" />
                <span>{tab.name}</span>
              </div>
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className="mt-10 md:mt-0 md:ml-2 p-7 lg:p-10 col-span-6 overflow-scroll rounded-lg bg-background-light dark:bg-background-dark">
          {tabs.map((tab) => (
            <Tab.Panel
              key={tab.hash}
              className="focus:outline-none focus:ring-0">
              <tab.panel />
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  )
}

const Page: NextPage<Props> = ({ fallback }) => {
  return (
    <UserProvicer fallback={fallback}>
      <Layout title="Perfil">
        <ProfilePage />
      </Layout>
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
