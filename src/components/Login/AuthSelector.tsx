import { FC, FormEvent, useState } from "react"

import {
  LockClosedIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/solid"

import { UserInfoResponse } from "@/pages/api/login/loginUserInfo"
import { getFetch } from "@/utils/browser/fetch"
import { InputHandler, useInput } from "@/utils/browser/hooks/useInput"
import { useAuth } from "@/utils/browser/hooks/useUser"

import Button from "../Button"

const EmailForm: FC<{
  email: string
  setEmail: InputHandler
  loading: boolean
}> = ({ email, setEmail, loading }) => {
  return (
    <>
      <span className="text-center text-xl font-bold text-slate-700 dark:text-slate-100 mb-6">
        Faça login com seu email da Unicamp
      </span>
      <label htmlFor="email-address" className="sr-only">
        Email da Unicamp
      </label>
      <input
        id="email-address"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="mb-4 appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-300 text-slate-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 disabled:bg-white"
        placeholder="você@[dac.]unicamp.br"
        value={email}
        onChange={setEmail}
        disabled={loading}
      />

      <div className="w-full">
        <Button
          type="submit"
          color="primary"
          icon={PaperAirplaneIcon}
          wide
          loading={loading}>
          Próximo
        </Button>
      </div>
    </>
  )
}

const CodeForm: FC<{
  code: string
  email: string
  undo: () => void
  setCode: InputHandler
  loading: boolean
}> = ({ code, email, undo, setCode, loading }) => {
  return (
    <>
      <span className="text-center text-xl font-bold text-slate-700 dark:text-slate-100 mb-5">
        Digite o código enviado pro seu email
      </span>
      <div className="text-xs text-slate-500 dark:text-slate-300 flex flex-col justify-center text-center mb-4">
        <span className="">{email}</span>
        <button
          className="text-primary dark:text-primary-400 underline w-max mx-auto"
          onClick={undo}
          type="button">
          Não é você?
        </button>
      </div>
      <label htmlFor="code" className="sr-only">
        Código enviado por email
      </label>
      <input
        id="code"
        name="code"
        type="text"
        autoComplete="none"
        required
        maxLength={4}
        minLength={4}
        className="mb-4 appearance-none relative block w-full text-center px-6 py-4 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-2xl mx-auto disabled:bg-white"
        placeholder="XXXX"
        value={code}
        onChange={setCode}
        disabled={loading}
      />

      <Button
        type="submit"
        color="blue"
        icon={LockClosedIcon}
        wide
        loading={loading}>
        Entrar
      </Button>
    </>
  )
}

const TOTPForm: FC<{
  code: string
  email: string
  undo: () => void
  useEmail: () => void
  setCode: InputHandler
  loading: boolean
}> = ({ code, email, undo, useEmail, setCode, loading }) => {
  return (
    <>
      <span className="text-center text-xl font-bold text-slate-700 dark:text-slate-100 mb-5">
        Digite o código que aparece no seu autenticador
      </span>
      <div className="text-xs text-slate-500 dark:text-slate-300 flex flex-col justify-center text-center mb-4">
        <span className="">{email}</span>
        <button
          className="text-primary dark:text-primary-400 underline w-max mx-auto"
          onClick={undo}
          type="button">
          Não é você?
        </button>
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-300 flex flex-col justify-center text-center mb-4">
        <button
          className="text-primary dark:text-primary-400 underline w-max mx-auto"
          onClick={useEmail}
          type="button">
          Autenticar de outra forma
        </button>
      </div>
      <label htmlFor="code" className="sr-only">
        Código do seu autenticador
      </label>
      <input
        id="code"
        name="code"
        type="text"
        autoComplete="none"
        required
        maxLength={6}
        minLength={6}
        className="mb-4 appearance-none relative block w-full text-center px-6 py-4 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-2xl mx-auto disabled:bg-white"
        placeholder="XXXXXX"
        value={code}
        onChange={setCode}
        disabled={loading}
      />

      <Button
        type="submit"
        color="blue"
        icon={LockClosedIcon}
        wide
        loading={loading}>
        Entrar
      </Button>
    </>
  )
}

const Login: FC = () => {
  const { sendEmailCode, login } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const [email, setEmail] = useInput()
  const [code, setCode] = useState<string>("")
  const [readyForCode, setReadyForCode] = useState(false)
  const [authMethod, setAuthMethod] = useState<"totp" | "email">("email")

  const setUppercaseCode: InputHandler = (e) =>
    setCode(e.target.value.toUpperCase())

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
    <div>
      <form className="relative" onSubmit={submit}>
        <div className="flex flex-col">
          {readyForCode || (
            <EmailForm email={email} setEmail={setEmail} loading={loading} />
          )}
          {readyForCode &&
            (authMethod === "email" ? (
              <CodeForm
                code={code}
                setCode={setUppercaseCode}
                loading={loading}
                email={email}
                undo={undoCodeSent}
              />
            ) : (
              <TOTPForm
                code={code}
                email={email}
                setCode={setUppercaseCode}
                loading={loading}
                undo={undoCodeSent}
                useEmail={handleSwitchToEmailAuth}
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
    </div>
  )
}

export default Login
