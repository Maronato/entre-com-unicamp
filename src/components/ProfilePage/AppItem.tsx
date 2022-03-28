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
      <div className="py-4 px-2 w-full flex flex-row items-center justify-start rounded transition duration-200 border border-opacity-0 dark:border-opacity-0 border-black dark:border-white hover:border-opacity-20 hover:dark:border-opacity-20">
        <div
          className={classNames("mr-2 aspect-square w-20", {
            "cursor-pointer": onClick,
          })}
          onClick={onClick}>
          <Avatar name={app.name} src={app.logo} />
        </div>
        <div className="flex flex-col overflow-hidden">
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
