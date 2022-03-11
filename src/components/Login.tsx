import { FC, FormEvent, useState } from "react"

import {
  LockClosedIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/solid"
import Image from "next/image"

import LogoDark from "@/public/logo/dark.png"
import LogoLight from "@/public/logo/light.png"
import { InputHandler, useInput } from "@/utils/hooks/useInput"
import { useAuth } from "@/utils/hooks/useUser"

import Button from "./Button"
import UnofficialPopover from "./UnofficialPopover"

const EmailForm: FC<{
  email: string
  setEmail: InputHandler
  loading: boolean
}> = ({ email, setEmail, loading }) => {
  return (
    <>
      <label htmlFor="email-address" className="sr-only">
        Email da Unicamp
      </label>
      <input
        id="email-address"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 disabled:bg-white"
        placeholder="Seu email da Unicamp"
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
          Enviar código por email
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
      <span className="text-center text-xl font-bold text-slate-700 dark:text-slate-100">
        Digite o código enviado pro seu email
      </span>
      <div className="text-xs text-slate-500 dark:text-slate-300 flex flex-col justify-center text-center">
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
        className="appearance-none relative block w-full text-center px-6 py-4 border border-slate-300 placeholder-slate-500 text-slate-900 rounded-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-2xl mx-auto disabled:bg-white"
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

const Login: FC = () => {
  const { sendEmailCode, login } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const [email, setEmail] = useInput()
  const [code, setCode] = useState<string>("")
  const [readyForCode, setReadyForCode] = useState(false)

  const setUppercaseCode: InputHandler = (e) =>
    setCode(e.target.value.toUpperCase())

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

  const handleLogin = async () => {
    setLoading(true)
    setError(undefined)
    const res = await login(email, code)
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
        handleSendEmailCode()
      }
    }
  }

  return (
    <div className="max-w-md w-full space-y-4 bg-background-lightest dark:bg-background-darker py-12 px-4 sm:px-6 lg:px-8 rounded-md shadow-md">
      <div>
        <div className="flex justify-center">
          <div className="w-20 hidden justify-center dark:flex">
            <Image src={LogoDark} alt="Logo" />
          </div>
          <div className="w-20 flex justify-center dark:hidden">
            <Image src={LogoLight} alt="Logo" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">
          Entre com Unicamp!
        </h2>
        <div className="text-center mx-auto w-full">
          <UnofficialPopover>
            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300 underline decoration-dashed">
              não oficial 🙊
            </p>
          </UnofficialPopover>
        </div>
      </div>
      <form className="mt-8 relative" onSubmit={submit}>
        <div className="flex space-y-3 flex-col">
          {readyForCode || (
            <EmailForm email={email} setEmail={setEmail} loading={loading} />
          )}
          {readyForCode && (
            <CodeForm
              code={code}
              setCode={setUppercaseCode}
              loading={loading}
              email={email}
              undo={undoCodeSent}
            />
          )}
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
