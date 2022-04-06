import { FunctionComponent } from "react"

import classNames from "classnames"

const Divider: FunctionComponent<{ className?: string }> = ({ className }) => {
  return (
    <hr
      className={classNames(
        "border-gray-600 dark:border-gray-400 border-opacity-40 dark:border-opacity-40",
        {
          [className || ""]: !!className,
          "my-10": !className,
        }
      )}
    />
  )
}

export default Divider
