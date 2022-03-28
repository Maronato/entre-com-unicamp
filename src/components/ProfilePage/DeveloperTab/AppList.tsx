import { FunctionComponent } from "react"

import useSWR from "swr"

import { getFetch } from "@/utils/browser/fetch"

import AppItem from "../AppItem"
import AppItemSkeleton from "../AppItemSkeleton"

import type { SerializedApp } from "@/oauth/app/types"

import CopyValue from "./CopyValue"

const AppList: FunctionComponent<{ select: (id: string) => unknown }> = ({
  select,
}) => {
  const { data, error } = useSWR(`/api/apps`, (url) =>
    getFetch<SerializedApp<false>[]>(url)
  )

  if (error) {
    return <div className="">Failed to load app</div>
  }
  if (!data) {
    return (
      <ul role="list" className="divide-y divide-black/20 dark:divide-white/20">
        {[0, 1, 2].map((_, i) => (
          <AppItemSkeleton key={i}>
            <div className="w-16 mr-2 bg-gray-300 h-3 rounded-md" />
            <div className="w-full bg-gray-300 h-3 rounded-md" />
          </AppItemSkeleton>
        ))}
      </ul>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full mx-auto text-center text-xl">
        Você ainda não criou nenhum app
      </div>
    )
  }

  return (
    <ul role="list" className="divide-y divide-black/20 dark:divide-white/20">
      {data.map((app) => (
        <AppItem
          key={app.client_id}
          app={app}
          onClick={() => select(app.client_id)}>
          <span className="min-w-max mr-2 text-sm text-slate-400">
            Client ID:{" "}
          </span>
          <CopyValue value={app.client_id} />
        </AppItem>
      ))}
    </ul>
  )
}

export default AppList
