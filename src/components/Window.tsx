import { FunctionComponent } from "react"

import classNames from "classnames"

const Window: FunctionComponent<{ className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div
      className={classNames(
        "max-w-md w-full space-y-4 bg-background-lightest dark:bg-background-dark py-12 px-4 sm:px-6 lg:px-8 rounded-md shadow-md",
        className
      )}>
      {children}
    </div>
  )
}

export default Window
