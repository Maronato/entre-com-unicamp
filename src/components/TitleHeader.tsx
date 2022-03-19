import { FunctionComponent } from "react"

import Image from "next/image"

import LogoDark from "@/public/logo/dark.png"
import LogoLight from "@/public/logo/light.png"

const TitleHeader: FunctionComponent = () => {
  return (
    <div>
      <div className="flex justify-center">
        <div className="w-20 hidden justify-center dark:flex">
          <Image src={LogoDark} alt="Logo" />
        </div>
        <div className="w-20 flex justify-center dark:hidden">
          <Image src={LogoLight} alt="Logo" />
        </div>
      </div>
      <h2 className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100">
        Entre com Unicamp!
      </h2>
    </div>
  )
}

export default TitleHeader
