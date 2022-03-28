import { FormEventHandler, FunctionComponent, useState } from "react"

import { SaveIcon, TrashIcon, UploadIcon } from "@heroicons/react/outline"
import classNames from "classnames"

import Avatar from "@/components/Avatar"
import Button from "@/components/Button"
import InputForm from "@/components/Forms/InputForm"
import { SerializedUser } from "@/oauth/user"
import { RequestData, ResponseData } from "@/pages/api/avatar"
import { uploadFile } from "@/utils/browser/avatar"
import { patchFetch, postFetch } from "@/utils/browser/fetch"
import { useUser } from "@/utils/browser/hooks/useUser"
import { generateIdenticon } from "@/utils/server/identicon"

import TabFrame from "../TabFrame"

type EditableUser = Pick<SerializedUser<false>, "name" | "avatar">

const ProfileTab: FunctionComponent = () => {
  const { user, mutate } = useUser()
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadAvatarButtonText, setUploadAvatarButtonText] =
    useState("Alterar foto")
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

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadingAvatar(true)
    setUploadAvatarButtonText("Carregando...")
    try {
      const signedURLPayload: RequestData = {
        operation: "getUploadURL",
      }
      const { url: uploadURL, nonce } = await postFetch<ResponseData>(
        "/api/avatar",
        signedURLPayload
      )

      const file = e.target.files?.[0]
      if (file) {
        const url = await uploadFile(uploadURL, user?.id || "", nonce, file)
        updateFormData("avatar", url)
        mutate()
      }
    } catch (e) {
      console.error(e)
    }
    setUploadingAvatar(false)
    setUploadAvatarButtonText("Alterar foto")
  }

  const removePhoto = () => {
    if (user) {
      updateFormData("avatar", generateIdenticon(user.email))
    }
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
          <div>
            <label
              htmlFor="avatar"
              className="block font-medium text-gray-700 dark:text-gray-200 mb-3">
              Foto de perfil
            </label>
            <div className="flex flex-row items-center">
              <div className="relative">
                <Avatar
                  className="w-20 h-20 lg:w-32 lg:h-32"
                  name={user.email}
                  src={`${formData.avatar}#${new Date().getTime()}`}
                />
              </div>
              <div className="flex flex-col space-y-2 ml-4">
                <label
                  htmlFor="avatar-upload"
                  className={classNames(
                    "px-4 py-2 rounded-md text-white transition-all duration-200 text-base flex flex-row items-center justify-between shadow",
                    {
                      "hover:bg-green-600 bg-green-500 cursor-pointer ":
                        !uploadingAvatar,
                      "bg-green-600 cursor-wait": uploadingAvatar,
                    }
                  )}>
                  <UploadIcon className="w-4 h-4 mr-2" />
                  <span>{uploadAvatarButtonText}</span>
                  <input
                    id="avatar-upload"
                    name="avatar-upload"
                    type="file"
                    onChangeCapture={uploadAvatar}
                    className="sr-only"
                    accept="image/*"
                    disabled={uploadingAvatar}
                  />
                </label>
                <Button
                  type="button"
                  color="red"
                  outline
                  onClick={removePhoto}
                  icon={TrashIcon}>
                  Remover foto
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-end">
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
