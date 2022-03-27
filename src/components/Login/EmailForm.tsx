import { FC } from "react"

import { AcademicCapIcon } from "@heroicons/react/outline"
import { PaperAirplaneIcon } from "@heroicons/react/solid"

import { InputHandler } from "@/utils/browser/hooks/useInput"

import Button from "../Button"

const EmailForm: FC<{
  email: string
  setEmail: InputHandler
  loading: boolean
}> = ({ email, setEmail, loading }) => {
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full text-gray-600 dark:text-gray-200 mb-3">
        <AcademicCapIcon className="w-12 h-12 mx-auto text-current mb-2" />
        <h2 className="text-xl text-center font-bold">Entre com Unicamp!</h2>
      </div>

      <p className="text-gray-400  text-center font-light text-sm mb-3">
        Use seu email da Unicamp para logar
      </p>

      <label htmlFor="email" className="sr-only">
        Email da Unicamp
      </label>
      <input
        id="email"
        name="email"
        type="text"
        inputMode="email"
        autoComplete="email"
        required
        className="rounded-md mb-4 appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-300 text-slate-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 text-lg disabled:bg-white"
        placeholder="fulano@[dac.]unicamp.br"
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
          {loading ? "Enviando código..." : "Seguinte"}
        </Button>
      </div>
    </div>
  )
}
export default EmailForm
