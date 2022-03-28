import { FunctionComponent } from "react"

const TextareaForm: FunctionComponent<{
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  htmlFor: string
  placeholder?: string
  autoComplete?: string
}> = ({ value, onChange, htmlFor, autoComplete, children, placeholder }) => {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-medium text-gray-700 dark:text-gray-200 mb-3">
        {children}
      </label>
      <textarea
        rows={5}
        value={value}
        onChange={onChange}
        name={htmlFor}
        id={htmlFor}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="px-3 py-2 text-black bg-white focus:ring-indigo-500 focus:border-indigo-500 block border-gray-300 rounded-md w-full text-base shadow"
      />
    </div>
  )
}

export default TextareaForm
