import { FunctionComponent, useState } from "react"

import useSWR, { mutate } from "swr"

import { getFetch, postFetch } from "@/utils/browser/fetch"

import Button from "../../Button"
import AppItem from "../AppItem"
import AppItemSkeleton from "../AppItemSkeleton"
import TabFrame from "../TabFrame"

import type { SerializedApp } from "@/oauth/app/types"
import type { DeauthorizeRequest } from "@/pages/api/apps/deauthorize"

const RevokeAccess: FunctionComponent<{ app: SerializedApp }> = ({ app }) => {
  const [loading, setLoading] = useState(false)

  const deauthorize = async () => {
    setLoading(true)
    try {
      const payload: DeauthorizeRequest = { client_id: app.client_id }
      await postFetch("/api/apps/deauthorize", payload)
      await mutate(`/api/apps/authorized`)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }
  return (
    <div className="flex flex-row justify-start w-full">
      <Button color="red" outline onClick={deauthorize} loading={loading} wide>
        Revogar acesso
      </Button>
    </div>
  )
}

const AuthorizedApps: FunctionComponent = () => {
  const { data, error } = useSWR(`/api/apps/authorized`, (url) =>
    getFetch<SerializedApp<false>[]>(url)
  )

  if (error) {
    return <div className="">Failed to load apps</div>
  }
  if (!data) {
    return (
      <ul role="list" className="divide-y divide-black/20 dark:divide-white/20">
        {[0, 1, 2].map((_, i) => (
          <AppItemSkeleton key={i}>
            <div className="w-full bg-gray-300 h-10 -mt-3 rounded-md" />
          </AppItemSkeleton>
        ))}
      </ul>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full mx-auto text-center text-xl">
        Você ainda não autorizou nenhum app
      </div>
    )
  }

  return (
    <ul role="list" className="divide-y divide-black/20 dark:divide-white/20">
      {data.map((app) => (
        <AppItem key={app.client_id} app={app}>
          <RevokeAccess app={app} />
        </AppItem>
      ))}
    </ul>
  )
}

const AppsTab: FunctionComponent = () => {
  return (
    <TabFrame
      title="Aplicativos"
      description="Esses são os aplicativos que você já autorizou">
      <AuthorizedApps />
    </TabFrame>
  )
}

export default AppsTab
