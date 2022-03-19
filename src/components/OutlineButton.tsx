import { FunctionComponent } from "react"

import Link from "next/link"

const OutlineLink: FunctionComponent<{ href: string }> = ({
  href,
  children,
}) => {
  return (
    <Link href={href}>
      <a className="mx-2 px-2 py-1 border rounded-md border-black dark:border-white text-md text-black dark:text-white border-opacity-0 dark:border-opacity-0 opacity-50 hover:opacity-100 hover:border-opacity-20 hover:dark:border-opacity-20 transition-all duration-200">
        {children}
      </a>
    </Link>
  )
}
export default OutlineLink
