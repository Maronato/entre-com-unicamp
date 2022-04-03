import {
  FormEvent,
  FormEventHandler,
  FunctionComponent,
  useEffect,
  useState,
} from "react"

import { SaveIcon, TrashIcon } from "@heroicons/react/outline"
import classNames from "classnames"
import useSWR from "swr"

import AvatarForm from "@/components/Forms/AvatarForm"
import InputForm from "@/components/Forms/InputForm"
import SwitchForm from "@/components/Forms/SwitchForm"
import TextareaForm from "@/components/Forms/TextareaForm"
import { AppType, SerializedApp } from "@/oauth/app/types"
import { getScopeDevDescription, REQUIRED_SCOPE } from "@/oauth/scope"
import { deleteFetch, getFetch, patchFetch } from "@/utils/browser/fetch"
import { isURL } from "@/utils/common/misc"

import Button from "../../Button"

import CopyValue from "./CopyValue"

const DeleteForm: FunctionComponent<{
  app: SerializedApp<true>
  onDelete: () => void
}> = ({ app, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmName, setConfirmName] = useState("")

  const canDelete = app.name === confirmName

  const deleteApp: FormEventHandler = async (e) => {
    e.preventDefault()
    if (loading) {
      return
    }
    setLoading(true)
    try {
      await deleteFetch(`/api/apps/${app.client_id}`)
      onDelete()
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <>
      {isDeleting || (
        <>
          <Button
            type="button"
            outline
            wide
            className="lg:hidden"
            color="red"
            onClick={() => setIsDeleting(true)}
            icon={TrashIcon}>
            Apagar app
          </Button>
          <Button
            type="button"
            outline
            className="hidden lg:flex"
            color="red"
            onClick={() => setIsDeleting(true)}
            icon={TrashIcon}>
            Apagar app
          </Button>
        </>
      )}
      {isDeleting && (
        <form
          onSubmit={deleteApp}
          className="flex flex-col max-w-xs space-y-4 items-center lg:items-end w-full">
          <InputForm
            htmlFor="app-name"
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={app.name}
            value={confirmName}>
            Confirme o nome do app
          </InputForm>
          <Button
            type="submit"
            color="red"
            wide
            className="lg:hidden"
            onClick={deleteApp}
            disabled={!canDelete}
            loading={loading}
            icon={TrashIcon}>
            Confirmar e apagar
          </Button>
          <Button
            type="submit"
            color="red"
            className="hidden lg:flex"
            onClick={deleteApp}
            disabled={!canDelete}
            loading={loading}
            icon={TrashIcon}>
            Confirmar e apagar
          </Button>
        </form>
      )}
    </>
  )
}

const ViewApp: FunctionComponent<{ clientID: string; goBack: () => void }> = ({
  clientID,
  goBack,
}) => {
  const { data, error, mutate } = useSWR(`/api/apps/${clientID}`, (url) =>
    getFetch<SerializedApp<true>>(url)
  )
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<SerializedApp<true>>>(
    data || {}
  )

  const updateFormData = <T extends keyof SerializedApp<true>>(
    field: T,
    data: SerializedApp<true>[T]
  ) => setFormData((prev) => ({ ...prev, [field]: data }))

  useEffect(() => {
    if (data) {
      setFormData(data)
    }
  }, [data])

  if (error) {
    return <div className="">Failed to load app</div>
  }
  if (!data) {
    return <div className="">Loading</div>
  }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) {
      return
    }
    setLoading(true)

    try {
      const payload: Partial<SerializedApp<true>> = {
        name: formData.name,
        redirect_uris: formData.redirect_uris,
        type: formData.type,
        logo: formData.logo,
      }
      const response = await patchFetch<SerializedApp<true>>(
        `/api/apps/${data.client_id}`,
        payload
      )
      mutate(response)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const isValid =
    formData.redirect_uris &&
    formData.redirect_uris.length > 0 &&
    formData.redirect_uris.every(isURL)

  return (
    <form onSubmit={save}>
      <div className="flex flex-col space-y-8">
        <div>
          <h3 className="text-gray-600 dark:text-gray-300 text-xl font-bold">
            Credenciais e escopo de acesso
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Essas são as credenciais que você usará para autenticar seus
            usuários no Entre com Unicamp.
          </p>
        </div>
        <div className="flex flex-col space-y-4">
          <div>
            <p className="block font-medium text-gray-700 dark:text-gray-200 mb-3">
              Client ID
            </p>
            <CopyValue value={data.client_id} />
          </div>
          <div>
            <p className="block font-medium text-gray-700 dark:text-gray-200 mb-3">
              Client secret
            </p>
            <CopyValue value={data.client_secret} secret />
          </div>
        </div>
        <hr className="border-gray-300 dark:border-gray-600" />
        <div>
          <h3 className="text-gray-600 dark:text-gray-300 text-xl font-bold">
            Permissões (ou scope)
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Essas são as permissões que seu app poderá pedir para seus usuários.
            <br />
            As permissões marcadas com <span className="text-red-500">
              *
            </span>{" "}
            sempre são aprovadas.
          </p>
          <div className="mt-4">
            <ul className="list-disc list-inside space-y-4">
              {data.scope.map((s) => (
                <li key={s} className="list-item">
                  <span
                    className={classNames({
                      "after:content-['*'] after:text-red-500":
                        REQUIRED_SCOPE.includes(s),
                    })}>
                    <span className="font-mono text-gray-200 bg-gray-700 px-1 py-1 rounded text-sm">
                      {s}
                    </span>
                  </span>
                  <p className="ml-4 mt-1">{getScopeDevDescription(s)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <hr className="border-gray-300 dark:border-gray-600" />
        <div>
          <h3 className="text-gray-600 dark:text-gray-300 text-xl font-bold">
            Informações e configurações
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            As configurações de OAuth e outros dados do app
          </p>
        </div>
        <AvatarForm
          identiconSource={formData.name || ""}
          setAvatarURL={(url) => updateFormData("logo", url)}
          pictureURL={formData.logo}>
          Logo
        </AvatarForm>
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
        </div>

        <hr className="border-gray-300 dark:border-gray-600" />
        <div className="flex flex-col justify-between items-start lg:flex-row">
          <div className="w-full lg:w-max">
            <Button
              type="submit"
              wide
              className="lg:hidden mb-5 lg:mb-0"
              color="primary"
              icon={SaveIcon}
              loading={loading}
              disabled={!isValid}>
              Salvar
            </Button>
            <Button
              type="submit"
              className="hidden lg:flex"
              color="primary"
              icon={SaveIcon}
              loading={loading}
              disabled={!isValid}>
              Salvar
            </Button>
          </div>
          <DeleteForm app={data} onDelete={goBack} />
        </div>
      </div>
    </form>
  )
}

export default ViewApp
