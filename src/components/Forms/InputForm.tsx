import { FunctionComponent } from "react"

import { InputHandler } from "@/utils/browser/hooks/useInput"

const InputForm: FunctionComponent<{
  value: string
  onChange: InputHandler
  htmlFor: string
  placeholder?: string
  autoComplete?: string
}> = ({ value, onChange, htmlFor, autoComplete, children, placeholder }) => {
  return (
    <>
      <label
        htmlFor={htmlFor}
        className="block font-medium text-gray-700 dark:text-gray-200 mb-3">
        {children}
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        name={htmlFor}
        id={htmlFor}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="px-3 py-2 text-black bg-white focus:ring-indigo-500 focus:border-indigo-500 block border-gray-300 rounded-md w-full text-base shadow"
      />
    </>
  )
}

export default InputForm
