import { FunctionComponent, useState } from "react"

import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/outline"

import { SerializedApp } from "@/oauth/app/types"

import Button from "../../Button"
import TabFrame from "../TabFrame"

import AppList from "./AppList"
import CreateApp from "./CreateApp"
import ViewApp from "./ViewApp"

type Screen = "list" | "create" | "view"

const Developer: FunctionComponent = () => {
  const [screen, setScreen] = useState<Screen>("list")
  const [app, setApp] = useState<SerializedApp<false>>()

  const updateApp = (app: SerializedApp<false>) => {
    setApp(app)
    setScreen("view")
  }

  if (screen === "list") {
    return (
      <div className="pt-4">
        <div className="flex flex-row justify-between items-center mb-10">
          <div className="text-2xl font-medium">Seus apps</div>
          <Button
            color="indigo"
            outline
            onClick={() => setScreen("create")}
            icon={PlusIcon}>
            Novo app
          </Button>
        </div>
        <AppList select={updateApp} />
      </div>
    )
  }

  if (screen === "create") {
    return (
      <div className="pt-4">
        <div className="flex flex-row justify-between items-center mb-10">
          <div className="text-2xl font-medium">Criar novo app</div>
          <Button
            color="indigo"
            outline
            onClick={() => setScreen("list")}
            icon={ArrowLeftIcon}>
            Voltar
          </Button>
        </div>
        <CreateApp onCreate={updateApp} />
      </div>
    )
  }

  if (screen === "view" && app) {
    return (
      <div className="pt-4">
        <div className="flex flex-row justify-between items-center mb-10">
          <div className="text-2xl font-medium">{app.name}</div>
          <Button
            color="indigo"
            outline
            onClick={() => setScreen("list")}
            icon={ArrowLeftIcon}>
            Voltar
          </Button>
        </div>
        <ViewApp clientID={app.client_id} goBack={() => setScreen("list")} />
      </div>
    )
  }

  return <div>Invalid component state</div>
}

const DeveloperTab: FunctionComponent = () => {
  return (
    <TabFrame
      title="Desenvolvedor"
      description="Crie apps para membros da Unicamp">
      <Developer />
    </TabFrame>
  )
}

export default DeveloperTab
