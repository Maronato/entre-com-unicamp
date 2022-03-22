import { FunctionComponent } from "react"

import LogoTitle from "./LogoTitle"
import ProfileButton from "./ProfileButton"

const Layout: FunctionComponent = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-5 px-10 grid grid-cols-2 md:grid-cols-2 items-center">
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
      <footer className="py-20 px-10 bg-background-light dark:bg-background-dark text-slate-700 dark:text-slate-300 border-t border-slate-300 dark:border-gray-700">
        hey
      </footer>
    </div>
  )
}

export default Layout
