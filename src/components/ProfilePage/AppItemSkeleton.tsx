import { FunctionComponent } from "react"

import { AppItemWrapper } from "./AppItem"

const AppItemSkeleton: FunctionComponent = ({ children }) => {
  return (
    <AppItemWrapper>
      <div className="p-4 grid grid-cols-12 items-center justify-start animate-pulse w-full">
        <div className="col-span-3 sm:col-span-2">
          <div className="w-12 bg-gray-300 h-12 rounded-full mx-auto" />
        </div>
        <div className="flex flex-col overflow-hidden col-span-9 sm:col-span-10">
          <div className="w-36 bg-gray-300 h-5 my-2 rounded-md mb-2" />
          <div className="flex flex-row items-center my-2">{children}</div>
        </div>
      </div>
    </AppItemWrapper>
  )
}

export default AppItemSkeleton
