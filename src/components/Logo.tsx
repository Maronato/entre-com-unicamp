import { FunctionComponent } from "react"

import classNames from "classnames"
import Image from "next/image"

import LogoDark from "@/public/logo/dark.png"
import LogoLight from "@/public/logo/light.png"

const Logo: FunctionComponent<{ large?: boolean }> = ({ large }) => {
  return (
    <div>
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
    </div>
  )
}

export default Logo
