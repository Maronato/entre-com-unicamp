import { FC, useState } from "react"

import { Popover } from "@headlessui/react"
import { usePopper } from "react-popper"

const UnofficialPopover: FC = ({ children }) => {
  const [referenceElement, setReferenceElement] = useState<HTMLButtonElement>()
  const [popperElement, setPopperElement] = useState<HTMLDivElement>()
  const { styles, attributes } = usePopper(referenceElement, popperElement)

  return (
    <Popover>
      <Popover.Button ref={(r: HTMLButtonElement) => setReferenceElement(r)}>
        {children}
      </Popover.Button>

      <Popover.Panel
        ref={(r: HTMLDivElement) => setPopperElement(r)}
        style={styles.popper}
        className="z-20"
        {...attributes.popper}>
        <div className="inline-flex items-center dark:bg-background-lightest bg-background-dark px-3 py-2 rounded-lg shadow-lg w-max mt-1 z-10 text-slate-200 dark:text-slate-500 text-sm">
          Feito por alunos com ❤️ . Código no
          <a
            href="https://github.com/maronato/entre-com-unicamp"
            className="inline-flex items-center dark:text-primary text-primary-400 underline ml-1">
            GitHub
          </a>
          <a href=""></a>
        </div>
      </Popover.Panel>
    </Popover>
  )
}

export default UnofficialPopover
