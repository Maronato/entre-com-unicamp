import { FunctionComponent } from "react"

import classNames from "classnames"

import Avatar from "../Avatar"

import type { SerializedApp } from "@/oauth/app/types"

export const AppItemWrapper: FunctionComponent = ({ children }) => {
  return <li className="flex py-4 first:pt-0 last:pb-0 w-full">{children}</li>
}

const AppItem: FunctionComponent<{
  app: SerializedApp<false>
  onClick?: () => void
}> = ({ app, onClick, children }) => {
  return (
    <AppItemWrapper>
      <div className="w-full p-4 grid grid-cols-12 items-center justify-start rounded transition duration-200 border border-opacity-0 dark:border-opacity-0 border-black dark:border-white hover:border-opacity-20 hover:dark:border-opacity-20">
        <div
          className={classNames("col-span-3 sm:col-span-2", {
            "cursor-pointer": onClick,
          })}
          onClick={onClick}>
          <Avatar className="mx-auto w-12" name={app.name} src={app.logo} />
        </div>
        <div className="flex flex-col overflow-hidden col-span-9 sm:col-span-10">
          <div
            className={classNames("text-xl font-bold mb-2 truncate text-left", {
              "cursor-pointer": onClick,
            })}
            onClick={onClick}>
            {app.name}
          </div>
          <div className="flex flex-row items-center">{children}</div>
        </div>
      </div>
    </AppItemWrapper>
  )
}

export default AppItem
