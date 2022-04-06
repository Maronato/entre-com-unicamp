import { FormEventHandler, FunctionComponent, useState } from "react"

import { SaveIcon } from "@heroicons/react/outline"
import classNames from "classnames"

import Button from "@/components/Button"
import Divider from "@/components/Divider"
import AvatarForm from "@/components/Forms/AvatarForm"
import InputForm from "@/components/Forms/InputForm"
import { SerializedUser } from "@/oauth/user"
import { patchFetch } from "@/utils/browser/fetch"
import { useUser } from "@/utils/browser/hooks/useUser"

import TabFrame from "../TabFrame"

import type { UnicampData } from "@/utils/server/unicamp"

type EditableUser = Pick<SerializedUser<false>, "name" | "picture">

const universityInfoMap: Record<keyof UnicampData, string> = {
  graduate_course: "Curso (Pós)",
  graduate_level: "Nível (Pós)",
  graduate_sub_course: "Modalidade (Pós)",
  intitute: "Instituto",
  undergraduate_course: "Curso",
  undergraduate_level: "Nível",
  undergraduate_sub_course: "Modalidade",
  university_id: "RA",
}

const AcademicInfoRow: FunctionComponent<{ name: string; value: string }> = ({
  name,
  value,
}) => (
  <tr
    className={classNames(
      "dark:odd:bg-background-darker dark:odd:bg-opacity-25",
      "odd:bg-gray-400 odd:bg-opacity-10"
    )}>
    <td className="px-4 py-2">
      <span className="text-sm font-semibold">
        {universityInfoMap[name as keyof UnicampData] || name}
      </span>
    </td>
    <td className="px-4 py-2">
      <span className="text-sm">{value}</span>
    </td>
  </tr>
)

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
      if (formData.picture !== user?.picture) {
        payload.picture = formData.picture
      }
      const updatedUser = await patchFetch<SerializedUser<false>>(
        "/api/me",
        payload
      )
      setFormData({ ...updatedUser })
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
            pictureURL={formData.picture}
            identiconSource={user.email}
            setAvatarURL={(url) => updateFormData("picture", url)}>
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
      <Divider />
      <section>
        <h2 className="text-2xl font-bold">Dados acadêmicos</h2>
        <p className="text-md text-gray-600 dark:text-gray-400 mt-3">
          {`Pegos do seu perfil público do GDE no momento que você criou sua conta no Entre com Unicamp`}
        </p>
        <table className="table-auto mt-5 w-full rounded-md border border-gray-400 dark:border-gray-600 border-separate border-opacity-40 dark:border-opacity-40">
          <tbody className="w-full">
            <AcademicInfoRow name="Email" value={user.email} />
            {Object.entries(user.university_info || {}).map(([key, value]) => (
              <AcademicInfoRow key={key} name={key} value={value} />
            ))}
          </tbody>
        </table>
      </section>
    </TabFrame>
  )
}

export default ProfileTab
