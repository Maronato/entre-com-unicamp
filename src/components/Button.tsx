import { ButtonHTMLAttributes, FC } from "react"

import { LockClosedIcon } from "@heroicons/react/solid"
import classnames from "classnames"

import LoadingIcon from "./LoadingIcon"

type Color =
  | "primary"
  | "secondary"
  | "blue"
  | "yellow"
  | "green"
  | "red"
  | "indigo"

const bgColorMap: Record<Color, string> = {
  primary: "bg-primary-500",
  secondary: "bg-secondary-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  red: "bg-red-500",
  indigo: "bg-indigo-500",
}

const textColorMap: Record<Color, string> = {
  primary: "text-primary-400",
  secondary: "text-secondary-400",
  blue: "text-blue-400",
  yellow: "text-yellow-400",
  green: "text-green-400",
  red: "text-red-400",
  indigo: "text-indigo-400",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  color: Color
  icon?: typeof LockClosedIcon
  wide?: boolean
}

const Button: FC<ButtonProps> = ({
  children,
  color,
  disabled,
  loading,
  className,
  icon,
  wide,
  ...props
}) => {
  const interactive = !disabled && !loading

  const Icon = icon

  return (
    <button
      {...props}
      className={classnames(
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white transition ease-in-out duration-150 group",
        bgColorMap[color],
        { "cursor-not-allowed opacity-90": !interactive },
        { "hover:opacity-90": interactive },
        { "w-full flex justify-center relative": wide, "w-max": !wide },
        className
      )}
      disabled={disabled}>
      {(loading || Icon) && (
        <span
          className={classnames("mr-3 -ml-1", {
            "absolute left-0 inset-y-0 flex items-center ml-3": wide,
          })}>
          {loading && <LoadingIcon />}
          {!loading && Icon && (
            <Icon
              aria-hidden="true"
              className={classnames("h-5 w-5", textColorMap[color])}
            />
          )}
        </span>
      )}
      {children}
    </button>
  )
}

export default Button
