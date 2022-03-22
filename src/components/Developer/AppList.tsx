import { FunctionComponent } from "react"

import useSWR from "swr"

import { getFetch } from "@/utils/browser/fetch"

import Avatar from "../Avatar"

import type { SerializedApp } from "@/oauth/app/types"

import CopyValue from "./CopyValue"

const AppItemWrapper: FunctionComponent = ({ children }) => {
  return <li className="flex py-4 first:pt-0 last:pb-0 w-full">{children}</li>
}

const AppItemSkeleton: FunctionComponent = () => {
  return (
    <AppItemWrapper>
      <div className="p-4 grid grid-cols-12 items-center justify-start animate-pulse w-full">
        <div className="col-span-3 sm:col-span-2">
          <div className="w-12 bg-gray-300 h-12 rounded-full mx-auto" />
        </div>
        <div className="flex flex-col overflow-hidden col-span-9 sm:col-span-10">
          <div className="w-36 bg-gray-300 h-5 my-2 rounded-md mb-2" />
          <div className="flex flex-row items-center my-2">
            <div className="w-16 mr-2 bg-gray-300 h-3 rounded-md" />
            <div className="w-full bg-gray-300 h-3 rounded-md" />
          </div>
        </div>
      </div>
    </AppItemWrapper>
  )
}

const AppItem: FunctionComponent<{
  app: SerializedApp<false>
  onClick: () => void
}> = ({ app, onClick }) => {
  return (
    <AppItemWrapper>
      <div className="p-4 grid grid-cols-12 items-center justify-start rounded transition duration-200 border border-opacity-0 dark:border-opacity-0 border-black dark:border-white hover:border-opacity-20 hover:dark:border-opacity-20">
        <button
          className="col-span-3 sm:col-span-2 cursor-pointer"
          onClick={onClick}>
          <Avatar className="mx-auto w-12" name={app.name} src={app.logo} />
        </button>
        <div className="flex flex-col overflow-hidden col-span-9 sm:col-span-10">
          <button
            className="text-xl font-bold mb-2 truncate cursor-pointer text-left"
            onClick={onClick}>
            {app.name}
          </button>
          <div className="flex flex-row items-center">
            <span className="min-w-max mr-2 text-sm text-slate-400">
              Client ID:{" "}
            </span>
            <CopyValue value={app.client_id} />
          </div>
        </div>
      </div>
    </AppItemWrapper>
  )
}

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
          <AppItemSkeleton key={i} />
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
          onClick={() => select(app.client_id)}
        />
      ))}
    </ul>
  )
}

export default AppList
