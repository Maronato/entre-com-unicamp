import { FC, useState } from "react"

import Image from "next/image"
import { useRouter } from "next/router"

import {
  RequestData,
  ErrorResponseData,
  ValidResponseData,
  ChallengeRequestData,
} from "@/pages/api/oauth/authorize"
import LogoDark from "@/public/logo/dark.png"
import LogoLight from "@/public/logo/light.png"
import { postFetch } from "@/utils/fetch"
import { useAuth } from "@/utils/hooks/useUser"

import Button from "./Button"

export type AuthorizeProps = Omit<
  RequestData,
  "resourceOwnerId" | "responseType"
> &
  Partial<Pick<ChallengeRequestData, "codeChallenge" | "codeChallengeMethod">>

export type ClientData = {
  name: string
  owner: {
    email: string
  }
}

const Authorize: FC<AuthorizeProps & { client: ClientData }> = ({
  clientId,
  redirectUri,
  scope,
  state,
  codeChallengeMethod,
  codeChallenge,
  client,
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (!user) {
    return null
  }

  const appName = client.name
  const appOwner = client.owner.email

  const url = new URL(redirectUri)
  if (state) {
    url.searchParams.append("state", state)
  }
  const redirect = () => router.push(url.href)

  const authorize = async () => {
    setLoading(true)
    try {
      const payload: Partial<ChallengeRequestData> = {
        clientId,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
        resourceOwnerId: user.id,
        responseType: "code",
        scope,
        state,
      }
      const response = await postFetch<ValidResponseData>(
        "/api/oauth/authorize",
        payload
      )
      url.searchParams.append("code", response.code)
    } catch (res: unknown) {
      // Redirect failure
      if (typeof res === "object" && res) {
        url.searchParams.append(
          "error",
          (await (res as Response).json())["error"] || "server_error"
        )
      } else {
        url.searchParams.append("error", "server_error")
      }
    }
    redirect()
  }
  const reject = async () => {
    setLoading(true)
    url.searchParams.append("error", "access_denied")
    redirect()
  }

  return (
    <div className="max-w-md w-full space-y-4 bg-background-lightest dark:bg-background-darker py-12 px-4 sm:px-6 lg:px-8 rounded-md shadow-md">
      <div>
        <div className="flex justify-center">
          <div className="w-20 hidden justify-center dark:flex">
            <Image src={LogoDark} alt="Logo" />
          </div>
          <div className="w-20 flex justify-center dark:hidden">
            <Image src={LogoLight} alt="Logo" />
          </div>
        </div>
        <h2
          className="mt-4 text-center text-3xl font-extrabold text-slate-900 dark:text-slate-100"
          onClick={() => authorize()}>
          Entre com Unicamp!
        </h2>
      </div>
      {appName}
      {appOwner}
      <Button
        type="button"
        color="blue"
        wide
        onClick={authorize}
        loading={loading}>
        Aceitar
      </Button>
      <Button type="button" color="red" wide onClick={reject} loading={loading}>
        Rejeitar
      </Button>
    </div>
  )
}

export default Authorize
