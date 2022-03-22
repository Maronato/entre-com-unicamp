import { FunctionComponent } from "react"

import { SwitchHorizontalIcon } from "@heroicons/react/outline"

import { SerializedApp } from "@/oauth/app/types"

import Avatar from "../Avatar"
import Logo from "../Logo"
import Window from "../Window"

const ExchangeLogos: FunctionComponent<{ app: SerializedApp<false> }> = ({
  app,
}) => {
  return (
    <div className="flex flex-row items-center justify-between w-56 mx-auto">
      <Avatar name={app.name} className="w-16" src={app.logo} />

      <SwitchHorizontalIcon className="w-5 h-5 text-black dark:text-white" />
      <div className="-mx-4">
        <Logo large />
      </div>
    </div>
  )
}

const Frame: FunctionComponent<{ app: SerializedApp }> = ({
  children,
  app,
}) => {
  return (
    <Window>
      <ExchangeLogos app={app} />
      <div className="text-2xl text-center pb-4 border-b dark:border-slate-600">
        {`Autorize `}
        <span className="font-bold">{app.name}</span>
      </div>
      <section className="pt-2">{children}</section>
    </Window>
  )
}

export default Frame
