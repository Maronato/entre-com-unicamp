import { FunctionComponent, useEffect, useState } from "react"

import { ClipboardCopyIcon } from "@heroicons/react/outline"
import classNames from "classnames"
import { useCopyToClipboard } from "react-use"

const CopyValue: FunctionComponent<{ secret?: boolean; value: string }> = ({
  secret,
  value,
}) => {
  const [clipboardState, copy] = useCopyToClipboard()
  const [copied, setCopied] = useState(!clipboardState.value)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setCopied(!!clipboardState.value)
    const t = setTimeout(() => setCopied(false), 3000)
    return () => clearTimeout(t)
  }, [clipboardState])

  return (
    <div className="flex flex-row items-center relative">
      {secret && (
        <button
          type="button"
          className="py-0.5 px-1 border mr-1 border-primary dark:border-primary-400 rounded text-primary dark:text-primary-400 text-xs flex-shrink hover:bg-primary hover:dark:bg-primary-400 hover:text-white transition-colors duration-100"
          onClick={() => setShow(!show)}>
          {show ? "esconder" : "mostrar"}
        </button>
      )}
      <div
        className={classNames(
          "grid grid-cols-10 text-sm p-1 bg-opacity-80 bg-gray-200 dark:bg-opacity-80 dark:bg-gray-700 rounded hover:bg-opacity-100 hover:dark:bg-opacity-100",
          "before:content-['Copiado!'] before:text-white before:bg-primary-500 before:py-1 before:px-2 before:-mt-1 before:-ml-1 before:rounded before:absolute",
          {
            "before:hidden": !copied,
          }
        )}>
        <span className="truncate overflow-hidden col-span-9">
          {(!secret || show) && value}
          {secret && !show && new Array(value.length + 1).join("∗")}
        </span>
        <button
          type="button"
          onClick={() => copy(value)}
          className="px-1 col-span-1 hover:scale-110 transition-all decoration-yellow-100">
          <ClipboardCopyIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default CopyValue
