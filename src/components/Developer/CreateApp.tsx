import { FormEvent, FunctionComponent, useState } from "react"

import { postFetch } from "@/utils/browser/fetch"
import { generateIdenticon } from "@/utils/server/identicon"

import Button from "../Button"

import type { AppType } from "@/oauth/app/types"
import type { CreateRequestData, CreateResponseData } from "@/pages/api/apps"

const CreateApp: FunctionComponent<{
  onCreate: (clientID: string) => void
}> = ({ onCreate }) => {
  const [name, setName] = useState("")
  const [redirect_uris, setRedirectURIs] = useState<string[]>([])
  const [type, setType] = useState<AppType>("public" as AppType)
  const [creating, setCreating] = useState(false)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    const payload: CreateRequestData = {
      name,
      logo: generateIdenticon(name),
      type,
      redirect_uris,
    }
    try {
      const app = await postFetch<CreateResponseData>("/api/apps", payload)
      if (app.client_id) {
        onCreate(app.client_id)
        return
      }
    } catch (e) {
      console.error(e)
    }
    setCreating(false)
  }

  return (
    <form onSubmit={create}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="App name"
      />
      <textarea
        value={redirect_uris.join("\n")}
        onChange={(e) => setRedirectURIs(e.target.value.split("\n"))}
        placeholder="Redirect uris"
      />
      <input
        value={type}
        onChange={(e) => setType(e.target.value as AppType)}
        placeholder="App Type"
      />
      <Button type="submit" color="blue" loading={creating}>
        Criar
      </Button>
    </form>
  )
}

export default CreateApp
