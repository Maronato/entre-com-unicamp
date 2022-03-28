import { FunctionComponent, useState } from "react"

import Button from "@/components/Button"

import TabFrame from "../TabFrame"

import DeleteAccount from "./DeleteAccount"
import TOTPOnboarding from "./TOTPOnboarding"

const AccountTab: FunctionComponent = () => {
  const [enableTOTP, setEnableTOTP] = useState(false)

  return (
    <TabFrame title="Conta" description="Alterar dados da conta">
      <div className="flex flex-col space-y-8">
        <div className="block pb-14 mb-10 border-b border-gray-600 dark:border-gray-400 border-opacity-20 dark:border-opacity-20">
          <label
            className="block text-gray-700 dark:text-gray-200 text-lg font-bold mb-3"
            htmlFor="name">
            Login usando códigos temporários
          </label>
          <p className="text-gray-600 dark:text-gray-400 mb-5">
            Permite que você entre na sua conta usando um gerador de códigos
            temporários como o Google Authenticator.
          </p>
          {enableTOTP ? (
            <TOTPOnboarding />
          ) : (
            <Button color="blue" onClick={() => setEnableTOTP(true)}>
              Ativar
            </Button>
          )}
        </div>
        <DeleteAccount />
      </div>
    </TabFrame>
  )
}

export default AccountTab
