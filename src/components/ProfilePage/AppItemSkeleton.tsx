import { FunctionComponent } from "react"

import { AppItemWrapper } from "./AppItem"

const AppItemSkeleton: FunctionComponent = ({ children }) => {
  return (
    <AppItemWrapper>
      <div className="py-4 px-2 flex flex-row items-center justify-start animate-pulse w-full">
        <div className="mr-2">
          <div className="bg-gray-300 rounded-full aspect-square w-12 md:w-20" />
        </div>
        <div className="flex flex-col overflow-hidden w-full">
          <div className="w-36 bg-gray-300 h-5 my-2 rounded-md mb-2" />
          <div className="flex flex-row items-center my-2">{children}</div>
        </div>
      </div>
    </AppItemWrapper>
  )
}

export default AppItemSkeleton
