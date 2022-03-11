import { FC } from "react"

const InvalidAuthorize: FC<{ error: string }> = ({ error }) => {
  return <div>{error}</div>
}

export default InvalidAuthorize
