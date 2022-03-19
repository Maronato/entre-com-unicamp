import { FunctionComponent } from "react"

import classNames from "classnames"
import Image from "next/image"
import Link from "next/link"

import LogoDark from "@/public/logo/dark.png"
import LogoLight from "@/public/logo/light.png"

const LogoTitle: FunctionComponent<{ large?: boolean }> = ({ large }) => {
  return (
    <Link href="/">
      <a className="flex flex-wrap items-center justify-center">
        <div
          className={classNames("h-min justify-center hidden dark:flex", {
            "w-20 mx-4": large,
            "w-12 mx-2": !large,
          })}>
          <Image src={LogoDark} alt="Logo" />
        </div>
        <div
          className={classNames("h-min justify-center flex dark:hidden", {
            "w-20 mx-4": large,
            "w-12 mx-2": !large,
          })}>
          <Image src={LogoLight} alt="Logo" />
        </div>
        <h2
          className={classNames(
            "text-center font-extrabold text-slate-900 dark:text-slate-100 tracking-tight",
            { "text-3xl": large, "text-xl": !large }
          )}>
          Entre com Unicamp!
        </h2>
      </a>
    </Link>
  )
}

export default LogoTitle
