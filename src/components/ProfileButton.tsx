import { FunctionComponent, useState } from "react"

import { Popover } from "@headlessui/react"
import { ChevronDownIcon, UserIcon } from "@heroicons/react/outline"
import classNames from "classnames"
import NextLink from "next/link"
import { usePopper } from "react-popper"

import { useAuth } from "@/utils/browser/hooks/useUser"

import Button from "./Button"

const ProfileDropdown: FunctionComponent<{
  toggleElement: HTMLElement | undefined
  close: () => unknown
}> = ({ toggleElement, close }) => {
  const { logout, user } = useAuth()

  const handleLogout = () => {
    logout()
    close()
  }

  const [popperElement, setPopperElement] = useState<HTMLDivElement>()
  const { styles, attributes } = usePopper(toggleElement, popperElement, {
    placement: "bottom-end",
  })
  return (
    <Popover.Panel
      ref={(r: HTMLDivElement) => setPopperElement(r)}
      style={styles.popper}
      className="z-20"
      {...attributes.popper}>
      <div className="inline-flex items-center dark:bg-background-lightest bg-background-dark py-5 rounded-lg shadow-lg z-10 text-slate-200 dark:text-slate-500 text-md">
        <div className="flex flex-col text-left space-y-2 w-full">
          <div className="group pt-1 pb-5 px-6 border-b w-min border-b-slate-600 dark:border-b-slate-300">
            Logado como <span className="font-bold">{user?.email}</span>
          </div>
          <NextLink href="/profile">
            <a
              className="group w-full pt-5 px-6 hover:text-white hover:dark:text-black transition-all duration-200"
              onClick={close}>
              Sua conta
            </a>
          </NextLink>
          <span
            className="group w-full pt-5 px-6 hover:text-white hover:dark:text-black transition-all duration-200 cursor-pointer"
            onClick={handleLogout}>
            Sair
          </span>
        </div>
      </div>
    </Popover.Panel>
  )
}

const LoggedInProfile: FunctionComponent = () => {
  const [toggleElement, setToggleElement] = useState<HTMLElement>()

  return (
    <Popover>
      {({ open, close }) => (
        <>
          <Popover.Button
            ref={(r: HTMLButtonElement) => setToggleElement(r)}
            className="p-3 flex flex-row items-center space-x-3">
            <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-current" />

            <ChevronDownIcon
              className={classNames("h-5 w-5 text-current", {
                "transform rotate-180": open,
              })}
            />
          </Popover.Button>
          <ProfileDropdown close={close} toggleElement={toggleElement} />
        </>
      )}
    </Popover>
  )
}

const ProfileButton: FunctionComponent = () => {
  const { user } = useAuth()

  if (!user) {
    return (
      <Button color="primary" href="/login">
        Entrar
      </Button>
    )
  }

  return <LoggedInProfile />
}

export default ProfileButton
