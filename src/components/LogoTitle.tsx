import { FunctionComponent } from "react"

import classNames from "classnames"
import Link from "next/link"

import Logo from "./Logo"

const LogoTitle: FunctionComponent<{ large?: boolean; hide?: boolean }> = ({
  large,
  hide,
}) => {
  return (
    <Link href="/">
      <a className="flex flex-wrap items-center justify-center">
        <Logo large={large} />
        <h2
          className={classNames(
            "text-center font-extrabold text-slate-900 dark:text-slate-100 tracking-tight",
            { "text-3xl": large, "text-xl": !large },
            { "hidden md:block": hide }
          )}>
          Entre com Unicamp!
        </h2>
      </a>
    </Link>
  )
}

export default LogoTitle
