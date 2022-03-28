import { FunctionComponent } from "react"

import { Switch } from "@headlessui/react"
import classNames from "classnames"

type Props = {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

const SwitchForm: FunctionComponent<Props> = ({
  checked,
  onChange,
  children,
  disabled,
}) => {
  return (
    <Switch.Group>
      <div className="flex items-center">
        <Switch
          disabled={disabled}
          checked={checked}
          onChange={onChange}
          className={classNames(
            "relative inline-flex flex-shrink-0 h-6 w-10 border-2 border-transparent rounded-full transition-colors ease-in-out duration-200 focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75 shadow",
            {
              "bg-primary dark:bg-primary-500": checked && !disabled,
              "bg-teal-700": !checked && !disabled,
              "bg-gray-400 cursor-not-allowed": disabled,
              "cursor-pointer": !disabled,
            }
          )}>
          <span
            aria-hidden="true"
            className={classNames(
              { "translate-x-4": checked, "translate-x-0": !checked },
              { "bg-slate-100": disabled },
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200"
            )}
          />
        </Switch>
        <Switch.Label
          className={classNames("ml-4 relative", {
            "after:content-['*'] after:ml-0.5 after:text-red-500": disabled,
          })}>
          {children}
        </Switch.Label>
      </div>
    </Switch.Group>
  )
}

export default SwitchForm
