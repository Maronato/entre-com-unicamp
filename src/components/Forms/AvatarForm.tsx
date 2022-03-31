import { FunctionComponent, useState } from "react"

import { TrashIcon, UploadIcon } from "@heroicons/react/outline"
import classNames from "classnames"

import Avatar from "@/components/Avatar"
import Button from "@/components/Button"
import { RequestData, ResponseData } from "@/pages/api/avatar"
import { postFetch } from "@/utils/browser/fetch"
import { generateIdenticon } from "@/utils/server/identicon"

export const uploadFile = async (
  signedURL: string,
  file: File
): Promise<true> => {
  const response = await fetch(signedURL, {
    headers: {
      "Content-Type": "image/*",
    },
    method: "PUT",
    body: file,
  })
  if (!response.ok) {
    throw new Error(`Upload API responded with ${response.status}`)
  }
  return true
}

const AvatarForm: FunctionComponent<{
  avatarURL?: string
  setAvatarURL: (newURL: string) => void
  identiconSource: string
}> = ({ avatarURL, setAvatarURL, identiconSource, children }) => {
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadAvatarButtonText, setUploadAvatarButtonText] =
    useState("Alterar imagem")

  const uploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadingAvatar(true)
    setUploadAvatarButtonText("Carregando...")
    try {
      const signedURLPayload: RequestData = {
        operation: "getUploadURL",
      }
      const { cdnURL, uploadURL } = await postFetch<ResponseData>(
        "/api/avatar",
        signedURLPayload
      )

      const file = e.target.files?.[0]
      if (file) {
        await uploadFile(uploadURL, file)
        setAvatarURL(cdnURL)
      }
    } catch (e) {
      console.error(e)
    }
    setUploadingAvatar(false)
    setUploadAvatarButtonText("Alterar imagem")
  }

  const removePhoto = () => {
    setAvatarURL(generateIdenticon(identiconSource))
  }

  return (
    <div>
      <label
        htmlFor="avatar"
        className="block font-medium text-gray-700 dark:text-gray-200 mb-3">
        {children}
      </label>
      <div className="flex flex-row items-center">
        <div className="relative">
          <Avatar
            className="w-20 h-20 lg:w-32 lg:h-32"
            name={identiconSource}
            src={avatarURL}
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
            Remover imagem
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AvatarForm
