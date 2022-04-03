import { ButtonHTMLAttributes, FC } from "react"

import { LockClosedIcon } from "@heroicons/react/solid"
import classnames from "classnames"
import NextLink from "next/link"

import LoadingIcon from "./LoadingIcon"

type Color =
  | "primary"
  | "secondary"
  | "blue"
  | "yellow"
  | "green"
  | "red"
  | "indigo"

const bgColorMap: Record<Color, [string, string, string]> = {
  primary: ["bg-primary-500", "hover:bg-primary-600", "hover:bg-primary-500"],
  secondary: [
    "bg-secondary-500",
    "hover:bg-secondary-600",
    "hover:bg-secondary-500",
  ],
  blue: ["bg-blue-500", "hover:bg-blue-600", "hover:bg-blue-500"],
  yellow: ["bg-yellow-500", "hover:bg-yellow-600", "hover:bg-yellow-500"],
  green: ["bg-green-500", "hover:bg-green-600", "hover:bg-green-500"],
  red: ["bg-red-500", "hover:bg-red-600", "hover:bg-red-500"],
  indigo: ["bg-indigo-500", "hover:bg-indigo-600", "hover:bg-indigo-500"],
}

const borderColorMap: Record<Color, string> = {
  primary: "border-primary-500",
  secondary: "border-secondary-500",
  blue: "border-blue-500",
  yellow: "border-yellow-500",
  green: "border-green-500",
  red: "border-red-500",
  indigo: "border-indigo-500",
}

const textColorMap: Record<Color, string> = {
  primary: "text-primary-300",
  secondary: "text-secondary-400",
  blue: "text-blue-300",
  yellow: "text-yellow-400",
  green: "text-green-300",
  red: "text-red-300",
  indigo: "text-indigo-400",
}

type ColorProps = {
  bg: string
  textColor: string
  borderColor: string
  hoverBgColor: string
  hoverTextColor: string
  hoverBorderColor: string
}

const getColors = (color: Color, outline?: boolean): ColorProps => {
  const props: ColorProps = {
    bg: bgColorMap[color][0],
    textColor: "text-white",
    borderColor: "border-transparent",
    hoverBgColor: bgColorMap[color][1],
    hoverTextColor: "",
    hoverBorderColor: "",
  }

  if (outline) {
    const override: Partial<ColorProps> = {
      bg: "bg-transparent",
      textColor: textColorMap[color],
      borderColor: borderColorMap[color],
      hoverBgColor: bgColorMap[color][2],
      hoverTextColor: "hover:text-white",
    }
    Object.assign(props, override)
  }
  return props
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  color: Color
  icon?: typeof LockClosedIcon
  wide?: boolean
  href?: string
  outline?: boolean
  large?: boolean
}

const Button: FC<ButtonProps> = ({
  children,
  color,
  disabled,
  loading,
  className,
  icon,
  wide,
  outline,
  href,
  large,
  ...props
}) => {
  const interactive = !disabled && !loading

  const Icon = icon

  const colors = getColors(color, outline)

  const button = (
    <button
      {...props}
      className={classnames(
        "focus:outline-none focus:ring-2 focus:ring-offset-2",
        "inline-flex items-center font-semibold leading-6 rounded-md transition ease-in-out duration-150 group",
        { "px-4 py-2 text-sm": !large, "px-8 py-4 text-lg": large },
        Object.values(colors).join(" "),
        { shadow: !outline },
        { border: outline },
        { "cursor-not-allowed opacity-90": !interactive },
        { "w-full flex justify-center relative": wide, "w-max": !wide },
        className
      )}
      disabled={!interactive}>
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

  if (!href) {
    return button
  }
  return (
    <NextLink href={href}>
      <a>{button}</a>
    </NextLink>
  )
}

export default Button
