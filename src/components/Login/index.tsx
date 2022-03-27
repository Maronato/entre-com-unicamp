import { FC, FormEvent, useState } from "react"

import { ExclamationCircleIcon } from "@heroicons/react/solid"

import { UserInfoResponse } from "@/pages/api/login/loginUserInfo"
import { getFetch } from "@/utils/browser/fetch"
import { InputHandler, useInput } from "@/utils/browser/hooks/useInput"
import { useAuth } from "@/utils/browser/hooks/useUser"

import EmailCodeForm from "./EmailCodeForm"
import EmailForm from "./EmailForm"
import TOTPForm from "./TOTPForm"

const Login: FC = () => {
  const { sendEmailCode, login } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const [email, setEmail] = useInput()
  const [code, setCode] = useState<string>("")
  const [readyForCode, setReadyForCode] = useState(false)
  const [authMethod, setAuthMethod] = useState<"totp" | "email">("email")

  const setUppercaseCode: InputHandler = (e) => {
    setError(undefined)
    setCode(e.target.value.toUpperCase())
  }

  const handleEmailSubmit = async () => {
    setLoading(true)
    setError(undefined)
    try {
      const { totpEnabled } = await getFetch<UserInfoResponse>(
        `/api/login/loginUserInfo?email=${email}`
      )
      if (totpEnabled) {
        setAuthMethod("totp")
        setLoading(false)
        setReadyForCode(true)
        setCode("")
      } else {
        handleSendEmailCode()
      }
    } catch (e) {
      handleSendEmailCode()
    }
  }

  const handleSendEmailCode = async () => {
    setLoading(true)
    setError(undefined)
    const res = await sendEmailCode(email)
    if (!res) {
      setError("Email inválido")
    } else {
      setReadyForCode(true)
      setCode("")
    }
    setLoading(false)
  }

  const handleSwitchToEmailAuth = () => {
    setAuthMethod("email")
    setReadyForCode(false)
    handleSendEmailCode()
  }

  const handleLogin = async () => {
    setLoading(true)
    setError(undefined)
    const res = await login(email, code, authMethod)
    if (!res) {
      setError("Código incorreto")
    }
    setLoading(false)
  }

  const undoCodeSent = () => {
    setReadyForCode(false)
    setError(undefined)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!loading) {
      if (readyForCode) {
        await handleLogin()
      } else {
        handleEmailSubmit()
      }
    }
  }

  return (
    <div className="divide-y divide-gray-300 dark:divide-gray-600">
      <form className="relative" onSubmit={submit}>
        <div className="flex flex-col">
          {readyForCode || (
            <EmailForm email={email} setEmail={setEmail} loading={loading} />
          )}
          {readyForCode &&
            (authMethod === "email" ? (
              <EmailCodeForm
                code={code}
                setCode={setUppercaseCode}
                loading={loading}
              />
            ) : (
              <TOTPForm
                code={code}
                setCode={setUppercaseCode}
                loading={loading}
              />
            ))}
        </div>
        {error && (
          <div className="absolute -bottom-8 text-sm text-red-400 flex space-x-2 items-center justify-center w-full">
            <span className="relative flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 absolute animate-ping inline-flex opacity-75" />{" "}
              <ExclamationCircleIcon className="h-5 w-5 relative inline-flex" />{" "}
            </span>
            <span className="font-bold">{error}</span>
          </div>
        )}
      </form>
      {readyForCode && (
        <div className="text-xs text-slate-500 dark:text-slate-300 flex flex-row justify-evenly pt-5 mt-10 items-center">
          <div className="flex flex-col text-center">
            <span className="">Entrando como</span>
            <span className="font-bold">{email}</span>
            <button
              className="text-primary dark:text-primary-400 underline w-max mx-auto"
              onClick={undoCodeSent}
              type="button">
              Não é você?
            </button>
          </div>
          {authMethod === "totp" && (
            <div className="flex flex-col text-center">
              <span className="font-bold">Com problemas?</span>
              <button
                className="text-primary dark:text-primary-400 underline w-max mx-auto"
                onClick={handleSwitchToEmailAuth}
                type="button">
                Autentique usando seu email
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Login
