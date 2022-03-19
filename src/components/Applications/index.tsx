import { FunctionComponent, useState } from "react"

import Button from "../Button"

import AppList from "./AppList"
import CreateApp from "./CreateApp"
import ViewApp from "./ViewApp"

type Screen = "list" | "create" | "view"

const Wrapper: FunctionComponent<{
  currentScreen: Screen
  setScreen: (screen: Screen) => void
}> = ({ children, currentScreen, setScreen }) => {
  return (
    <div>
      {currentScreen !== "list" && (
        <Button color="secondary" onClick={() => setScreen("list")}>
          Voltar
        </Button>
      )}
      {children}
      {currentScreen === "list" && (
        <Button color="secondary" onClick={() => setScreen("create")}>
          Criar app
        </Button>
      )}
    </div>
  )
}

const Applications: FunctionComponent = () => {
  const [screen, setScreen] = useState<Screen>("list")
  const [clientID, setClientID] = useState<string>()

  const updateClientID = (id: string) => {
    setClientID(id)
    setScreen("view")
  }

  if (screen === "list") {
    return (
      <Wrapper currentScreen={screen} setScreen={setScreen}>
        <AppList viewApp={updateClientID} />
      </Wrapper>
    )
  }

  if (screen === "create") {
    return (
      <Wrapper currentScreen={screen} setScreen={setScreen}>
        <CreateApp onCreate={updateClientID} />
      </Wrapper>
    )
  }

  if (screen === "view" && clientID) {
    return (
      <Wrapper currentScreen={screen} setScreen={setScreen}>
        <ViewApp clientID={clientID} />
      </Wrapper>
    )
  }

  return <div>Invalid component state</div>
}

export default Applications
