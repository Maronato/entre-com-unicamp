import { FC, useState } from "react"

import { useRouter } from "next/router"

import { SerializedApp } from "@/oauth2/app"
import {
  RequestData,
  ValidResponseData,
  ChallengeRequestData,
} from "@/pages/api/oauth/authorize"
import { postFetch } from "@/utils/fetch"
import { useAuth } from "@/utils/hooks/useUser"

import Button from "./Button"
import TitleHeader from "./TitleHeader"
import Window from "./Window"

export type AuthorizeProps = Omit<
  RequestData,
  "resourceOwnerId" | "responseType"
> &
  Partial<Pick<ChallengeRequestData, "codeChallenge" | "codeChallengeMethod">>

const Authorize: FC<AuthorizeProps & { app: SerializedApp }> = ({
  clientID,
  redirectUri,
  scope,
  state,
  codeChallengeMethod,
  codeChallenge,
  app,
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (!user) {
    return null
  }

  const appName = app.name
  const appOwner = app.owner.email

  const url = new URL(redirectUri)
  if (state) {
    url.searchParams.append("state", state)
  }
  const redirect = () => router.push(url.href)

  const authorize = async () => {
    setLoading(true)
    try {
      const payload: Partial<ChallengeRequestData> = {
        clientID,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
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
    <Window>
      <TitleHeader />
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
    </Window>
  )
}

export default Authorize
