import { FC } from "react"

import { MailIcon } from "@heroicons/react/outline"
import { LockClosedIcon } from "@heroicons/react/solid"

import { InputHandler } from "@/utils/browser/hooks/useInput"

import Button from "../Button"

const EmailCodeForm: FC<{
  code: string
  setCode: InputHandler
  loading: boolean
}> = ({ code, setCode, loading }) => {
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full text-gray-600 dark:text-gray-200 mb-3">
        <MailIcon className="w-12 h-12 mx-auto text-current mb-2" />
        <h2 className="text-xl text-center font-bold">Olhe o seu email</h2>
      </div>

      <p className="text-gray-400  text-center font-light text-sm mb-3">
        Digite o código enviado pro seu email
      </p>

      <label htmlFor="code" className="sr-only">
        Código enviado por email
      </label>
      <input
        id="code"
        name="code"
        type="text"
        inputMode="text"
        pattern="[A-Z0-9]{4}"
        autoComplete="one-time-code"
        required
        maxLength={4}
        minLength={4}
        className="mb-4 appearance-none relative block w-full text-center px-3 py-2 border border-slate-300 placeholder-slate-300 text-slate-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-xl mx-auto disabled:bg-white"
        placeholder="4 caracteres"
        value={code}
        onChange={setCode}
        disabled={loading}
      />

      <Button
        type="submit"
        color="blue"
        icon={LockClosedIcon}
        wide
        disabled={code.length !== 4}
        loading={loading}>
        Entrar
      </Button>
    </div>
  )
}
export default EmailCodeForm
