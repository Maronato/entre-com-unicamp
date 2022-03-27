import { FunctionComponent } from "react"

import LogoTitle from "../LogoTitle"
import ProfileButton from "../ProfileButton"

const Layout: FunctionComponent = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-5 px-10 grid grid-cols-2 md:grid-cols-2 items-center mx-auto w-full max-w-screen-xl">
        <div className="flex flex-row justify-start">
          <LogoTitle hide />
        </div>
        <div className="flex flex-row justify-end">
          <ProfileButton />
        </div>
      </header>
      <main className="flex-grow px-5 w-full max-w-md md:max-w-screen-lg mx-auto my-10">
        {children}
      </main>
    </div>
  )
}

export default Layout
