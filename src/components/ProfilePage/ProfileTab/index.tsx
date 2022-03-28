import { FormEventHandler, FunctionComponent, useState } from "react"

import { SaveIcon } from "@heroicons/react/outline"

import Button from "@/components/Button"
import AvatarForm from "@/components/Forms/AvatarForm"
import InputForm from "@/components/Forms/InputForm"
import { SerializedUser } from "@/oauth/user"
import { patchFetch } from "@/utils/browser/fetch"
import { useUser } from "@/utils/browser/hooks/useUser"

import TabFrame from "../TabFrame"

type EditableUser = Pick<SerializedUser<false>, "name" | "avatar">

const ProfileTab: FunctionComponent = () => {
  const { user, mutate } = useUser()

  const [formData, setFormData] = useState<Partial<EditableUser>>(
    { ...user } || {}
  )
  const [submitLoading, setSubmitLoading] = useState(false)

  const updateFormData = <T extends keyof EditableUser>(
    field: T,
    data: EditableUser[T]
  ) => {
    setFormData({
      ...formData,
      [field]: data,
    })
  }

  const submit: FormEventHandler = async (e) => {
    e.preventDefault()
    if (submitLoading) {
      return
    }
    setSubmitLoading(true)
    try {
      const payload: typeof formData = {}
      if (formData.name !== user?.name) {
        payload.name = formData.name
      }
      if (formData.avatar !== user?.avatar) {
        payload.avatar = formData.avatar
      }
      await patchFetch<SerializedUser<false>>("/api/me", payload)
      mutate()
    } catch (e) {
      console.error(e)
    }
    setSubmitLoading(false)
  }

  if (!user) {
    return null
  }

  return (
    <TabFrame
      title="Perfil"
      description="Essas informações ficam disponíveis pra todos os apps que você aprovar">
      <div className="flex flex-col">
        <form onSubmit={submit} className="text-xl flex flex-col space-y-12">
          <div className="max-w-md">
            <InputForm
              onChange={(e) => updateFormData("name", e.target.value)}
              htmlFor="name"
              value={formData.name || ""}
              autoComplete="name"
              placeholder="Fulano de Tal">
              Nome
            </InputForm>
          </div>
          <AvatarForm
            avatarURL={formData.avatar}
            identiconSource={user.email}
            setAvatarURL={(url) => updateFormData("avatar", url)}>
            Foto de perfil
          </AvatarForm>
          <div className="flex flex-row justify-start">
            <Button
              color="primary"
              icon={SaveIcon}
              type="submit"
              loading={submitLoading}>
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </TabFrame>
  )
}

export default ProfileTab
