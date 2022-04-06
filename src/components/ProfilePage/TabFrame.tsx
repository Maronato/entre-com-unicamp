import { FunctionComponent } from "react"

const TabFrame: FunctionComponent<{ title: string; description?: string }> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="flex flex-col">
      <div className="mb-10">
        <h2 className="text-4xl font-bold">{title}</h2>
        {description && (
          <p className="text-md text-gray-600 dark:text-gray-400 mt-3">
            {description}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

export default TabFrame
