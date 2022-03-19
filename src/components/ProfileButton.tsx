import { FunctionComponent } from "react"

import { useUser } from "@/utils/browser/hooks/useUser"

import OutlineLink from "./OutlineButton"

const ProfileButton: FunctionComponent = () => {
  const { user } = useUser()

  if (!user) {
    return <OutlineLink href="/login">Entrar</OutlineLink>
  }

  return <div>{user.email}</div>
}

export default ProfileButton
