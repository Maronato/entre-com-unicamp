import { FormEvent, FunctionComponent, useState } from "react"

import { PlusIcon } from "@heroicons/react/outline"

import AvatarForm from "@/components/Forms/AvatarForm"
import InputForm from "@/components/Forms/InputForm"
import SwitchForm from "@/components/Forms/SwitchForm"
import TextareaForm from "@/components/Forms/TextareaForm"
import { AppType, SerializedApp } from "@/oauth/app/types"
import { postFetch } from "@/utils/browser/fetch"
import { isURL } from "@/utils/common/misc"

import Button from "../../Button"

import type { CreateRequestData } from "@/pages/api/apps"

const CreateApp: FunctionComponent<{
  onCreate: (app: SerializedApp<false>) => void
}> = ({ onCreate }) => {
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<Partial<SerializedApp<true>>>({
    redirect_uris: [],
    type: AppType.PUBLIC,
  })
  const updateFormData = <T extends keyof SerializedApp<true>>(
    field: T,
    data: SerializedApp<true>[T]
  ) => setFormData((prev) => ({ ...prev, [field]: data }))

  const isValid =
    formData.redirect_uris &&
    formData.redirect_uris.length > 0 &&
    formData.redirect_uris.every(isURL) &&
    formData.name &&
    formData.name.length >= 5

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (creating) {
      return
    }
    setCreating(true)

    const payload: Partial<CreateRequestData> = {
      name: formData.name?.trim(),
      logo: formData.logo,
      redirect_uris: formData.redirect_uris,
      type: formData.type,
    }
    try {
      const app = await postFetch<SerializedApp>("/api/apps", payload)
      if (app.client_id) {
        onCreate(app)
        return
      }
    } catch (e) {
      console.error(e)
    }
    setCreating(false)
  }

  return (
    <form onSubmit={create} className="flex flex-col space-y-8">
      <p className="text-gray-500 dark:text-gray-400 -mt-8">
        Em dúvida sobre o que colocar aqui? Leia{" "}
        <a
          href="https://www.oauth.com/oauth2-servers/client-registration/registering-new-application/"
          className="text-blue-500 dark:text-blue-400 underline">
          esse artigo
        </a>{" "}
        para aprender mais sobre OAuth2 e o seu app.
      </p>
      <InputForm
        htmlFor="name"
        onChange={(e) => updateFormData("name", e.target.value)}
        value={formData.name || ""}
        autoComplete="none"
        placeholder="Meu Super App">
        Nome
      </InputForm>
      <AvatarForm
        identiconSource={formData.name || ""}
        setAvatarURL={(url) => updateFormData("logo", url)}
        avatarURL={formData.logo}>
        Logo
      </AvatarForm>
      <hr className="border-gray-300 dark:border-gray-600" />
      <div>
        <h3 className="text-gray-600 dark:text-gray-300 text-xl font-bold">
          Identificando e autenticando seus usuários
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          O Entre com Unicamp só implementa o fluxo{" "}
          <a
            href="https://www.oauth.com/oauth2-servers/server-side-apps/example-flow/"
            className="text-blue-500 dark:text-blue-400 underline">
            Authorization Code
          </a>
          .<br /> Para proteger apps públicos é obrigatório o uso de{" "}
          <a
            href="https://www.oauth.com/oauth2-servers/pkce/"
            className="text-blue-500 dark:text-blue-400 underline">
            PKCE
          </a>
          .
        </p>
      </div>
      <div>
        <TextareaForm
          htmlFor="redirect_uris"
          onChange={(e) =>
            updateFormData(
              "redirect_uris",
              e.target.value.split("\n").map((url) => url.trim())
            )
          }
          value={formData.redirect_uris?.join("\n") || ""}
          placeholder="https://meuapp.com/callback"
          autoComplete="none">
          URLs de redirecionamento (uma por linha)
        </TextareaForm>
        <span className="text-gray-500 dark:text-gray-400 mt-3 block">
          <p>
            Pelo menos uma URL é necessária. Para mais informações,{" "}
            <a
              href="https://www.oauth.com/oauth2-servers/redirect-uris/"
              className="text-blue-500 dark:text-blue-400 underline">
              leia esse documento
            </a>
            .
          </p>
        </span>
      </div>

      <div>
        <p className="block font-medium text-gray-700 dark:text-gray-200 mb-3">
          Tipo de App
        </p>
        <SwitchForm
          checked={formData.type === AppType.PUBLIC}
          onChange={(e) =>
            updateFormData("type", e ? AppType.PUBLIC : AppType.CONFIDENTIAL)
          }>
          {formData.type === AppType.PUBLIC ? "Público" : "Confidencial"}
        </SwitchForm>
        <span className="text-gray-500 dark:text-gray-400 mt-3 block">
          <ul className="list-inside list-disc">
            <li className="list-item">
              <b>Público</b>: Seu app roda 100% no navegador ou como um
              aplicativo nativo.
            </li>
            <li className="list-item">
              <b>Confidencial</b>: Seu app roda em um servidor e você consegue
              guardar suas credenciais de forma segura.
            </li>
          </ul>
        </span>
      </div>

      <hr className="border-gray-300 dark:border-gray-600" />

      <Button
        type="submit"
        color="blue"
        loading={creating}
        icon={PlusIcon}
        disabled={!isValid}>
        Criar
      </Button>
    </form>
  )
}

export default CreateApp
