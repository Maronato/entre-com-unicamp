import { FunctionComponent, useState } from "react"

import Button from "@/components/Button"
import InputForm from "@/components/Forms/InputForm"
import { deleteFetch } from "@/utils/browser/fetch"
import { useAuth } from "@/utils/browser/hooks/useUser"

const DeleteAccount: FunctionComponent = () => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [email, setEmail] = useState("")
  const { user, logout } = useAuth()

  if (!user) {
    return null
  }

  const deleteAccount = async () => {
    try {
      await deleteFetch("/api/me").then(logout)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="border border-red-500 rounded-lg p-4">
      <span className="text-red-500 text-xl font-bold mb-4 block">
        Apagar conta
      </span>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Apagar sua conta é irreversível. Caso você decida voltar a usar o Entre
        com Unicamp, terá que confirmar sua identidade e autorizar todos os apps
        novamente.
      </p>
      {!isDeleting && (
        <Button type="button" color="red" onClick={() => setIsDeleting(true)}>
          Apagar conta
        </Button>
      )}
      {isDeleting && (
        <>
          <InputForm
            htmlFor="email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            placeholder={user.email}
            autoComplete="none">
            Confirme seu email para prosseguir
          </InputForm>
          <Button
            className="mt-4"
            type="button"
            color="red"
            onClick={deleteAccount}
            disabled={user.email !== email}>
            Confirmar e apagar
          </Button>
        </>
      )}
    </div>
  )
}

export default DeleteAccount
