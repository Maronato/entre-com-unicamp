import { FunctionComponent, useState } from "react"

import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/outline"

import Button from "../../Button"
import TabFrame from "../TabFrame"

import AppList from "./AppList"
import CreateApp from "./CreateApp"
import ViewApp from "./ViewApp"

type Screen = "list" | "create" | "view"

const Developer: FunctionComponent = () => {
  const [screen, setScreen] = useState<Screen>("list")
  const [clientID, setClientID] = useState<string>()

  const updateClientID = (id: string) => {
    setClientID(id)
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
        <AppList select={updateClientID} />
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
        <CreateApp onCreate={updateClientID} />
      </div>
    )
  }

  if (screen === "view" && clientID) {
    return (
      <div className="pt-4">
        <div className="flex flex-row justify-between items-center mb-10">
          <div className="text-2xl font-medium">Detalhes do app</div>
          <Button
            color="indigo"
            outline
            onClick={() => setScreen("list")}
            icon={ArrowLeftIcon}>
            Voltar
          </Button>
        </div>
        <ViewApp clientID={clientID} />
      </div>
    )
  }

  return <div>Invalid component state</div>
}

const DeveloperTab: FunctionComponent = () => {
  return (
    <TabFrame
      title="Desenvolvedor"
      description="Precisa de ajuda? Dá uma lida na documentação">
      <Developer />
    </TabFrame>
  )
}

export default DeveloperTab
