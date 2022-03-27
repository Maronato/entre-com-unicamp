import { FC } from "react"

import { DeviceMobileIcon } from "@heroicons/react/outline"
import { LockClosedIcon } from "@heroicons/react/solid"

import { InputHandler } from "@/utils/browser/hooks/useInput"

import Button from "../Button"

const TOTPForm: FC<{
  code: string
  setCode: InputHandler
  loading: boolean
}> = ({ code, setCode, loading }) => {
  const fromatCode = () => {
    const split = code.split("")
    return split.map((c, i) => (i === 3 ? `-${c}` : c)).join("")
  }

  const updateCode: InputHandler = (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 6)
    setCode(e)
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full text-gray-600 dark:text-gray-200 mb-3">
        <DeviceMobileIcon className="w-12 h-12 mx-auto text-current mb-2" />
        <h2 className="text-xl text-center font-bold">Código de autentição</h2>
      </div>

      <p className="text-gray-400  text-center font-light text-sm mb-3">
        Abra o gerador de códigos no seu celular para ver seu código de
        autenticação
      </p>

      <label htmlFor="token" className="sr-only">
        Código do seu autenticador
      </label>
      <input
        id="token"
        name="token"
        type="text"
        inputMode="numeric"
        pattern="[0-9-]{7}"
        autoComplete="one-time-code"
        required
        className="mb-4 appearance-none relative block w-full text-center px-3 py-2 border border-slate-300 placeholder-slate-300 text-slate-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-xl mx-auto disabled:bg-white"
        placeholder="6 dígitos"
        value={fromatCode()}
        onChange={updateCode}
        disabled={loading}
      />

      <Button
        type="submit"
        color="blue"
        icon={LockClosedIcon}
        wide
        disabled={code.length !== 6}
        loading={loading}>
        Entrar
      </Button>
    </div>
  )
}

export default TOTPForm
