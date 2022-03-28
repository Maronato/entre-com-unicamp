import { FormEvent, FunctionComponent, useState } from "react"

import AvatarForm from "@/components/Forms/AvatarForm"
import { AppType, SerializedApp } from "@/oauth/app/types"
import { postFetch } from "@/utils/browser/fetch"

import Button from "../../Button"

import type { CreateRequestData, CreateResponseData } from "@/pages/api/apps"

const CreateApp: FunctionComponent<{
  onCreate: (clientID: string) => void
}> = ({ onCreate }) => {
  const [formData, setFormData] = useState<Partial<SerializedApp<true>>>({})

  const updateFormData = <T extends keyof SerializedApp<true>>(
    field: T,
    data: SerializedApp<true>[T]
  ) => setFormData((prev) => ({ ...prev, [field]: data }))
  const [creating, setCreating] = useState(false)

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    const payload: CreateRequestData = {
      name: formData.name || "",
      logo: formData.logo || "",
      type: formData.type || AppType.PUBLIC,
      redirect_uris: formData.redirect_uris || [],
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
        value={formData.name}
        onChange={(e) => updateFormData("name", e.target.value)}
        placeholder="App name"
      />
      <AvatarForm
        identiconSource={formData.name || ""}
        setAvatarURL={(url) => updateFormData("logo", url)}
        avatarURL={formData.logo}>
        Logo do app
      </AvatarForm>
      <textarea
        value={formData.redirect_uris?.join("\n")}
        onChange={(e) =>
          updateFormData("redirect_uris", e.target.value.split("\n"))
        }
        placeholder="Redirect uris"
      />
      <input
        value={formData.type}
        onChange={(e) => updateFormData("type", e.target.value as AppType)}
        placeholder="App Type"
      />
      <Button type="submit" color="blue" loading={creating}>
        Criar
      </Button>
    </form>
  )
}

export default CreateApp
