import { FC } from "react"

const Window: FC = ({ children }) => {
  return (
    <div className="max-w-md w-full space-y-4 bg-background-lightest dark:bg-background-darker py-12 px-4 sm:px-6 lg:px-8 rounded-md shadow-md">
      {children}
    </div>
  )
}

export default Window
