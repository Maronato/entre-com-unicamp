import { FunctionComponent, useCallback, useEffect, useState } from "react"

import { Switch } from "@headlessui/react"
import classNames from "classnames"
import { useRouter } from "next/router"

import { SerializedApp } from "@/oauth/app/types"
import { getScopeDescription, REQUIRED_SCOPE, Scope } from "@/oauth/scope"
import {
  ValidResponseData,
  ChallengeRequestData,
} from "@/pages/api/oauth/authorize"
import { getFetch, postFetch } from "@/utils/browser/fetch"
import { useAuth } from "@/utils/browser/hooks/useUser"

import Button from "../Button"

import { AuthorizeProps } from "."

const Permission: FunctionComponent<{
  scope: Scope
  value: boolean
  setValue: (newValue: boolean) => unknown
}> = ({ scope, setValue, value }) => {
  const isRequired = REQUIRED_SCOPE.includes(scope)
  const description = getScopeDescription(scope)

  return (
    <Switch.Group>
      <div className="flex items-center">
        <Switch
          disabled={isRequired}
          checked={value}
          onChange={setValue}
          className={classNames(
            "relative inline-flex flex-shrink-0 h-6 w-10 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75 shadow",
            {
              "bg-primary dark:bg-primary-500": value && !isRequired,
              "bg-teal-700": !value && !isRequired,
              "bg-slate-400": isRequired,
            }
          )}>
          <span
            aria-hidden="true"
            className={classNames(
              { "translate-x-4": value, "translate-x-0": !value },
              { "bg-slate-100": isRequired },
              "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200"
            )}
          />
        </Switch>
        <Switch.Label
          className={classNames("ml-4 relative", {
            "after:content-['*'] after:ml-0.5 after:text-red-500": isRequired,
          })}>
          {description}
        </Switch.Label>
      </div>
    </Switch.Group>
  )
}

const UserAuthorization: FunctionComponent<
  AuthorizeProps & { app: SerializedApp }
> = ({
  clientID,
  redirectUri,
  scope = REQUIRED_SCOPE,
  state,
  codeChallengeMethod,
  codeChallenge,
  app,
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [buttonClicked, setButtonClicked] = useState<"authorize" | "reject">()
  const router = useRouter()

  const [selectedScope, setSelectedScope] = useState(
    scope.reduce(
      (agg, s) => ({ ...agg, [s]: true }),
      {} as Record<Scope, boolean>
    )
  )

  const selectedScopeList = (
    Object.entries(selectedScope) as [Scope, boolean][]
  )
    .filter(([_, v]) => v)
    .map(([s]) => s)

  const redirect = useCallback(
    (searchParams: URLSearchParams) => {
      const url = new URL(redirectUri)
      searchParams.forEach((v, k) => url.searchParams.set(k, v))
      router.push(url.href)
    },
    [router, redirectUri]
  )

  const authorize = useCallback(async () => {
    setLoading(true)
    setButtonClicked("authorize")
    const searchParams = new URLSearchParams()
    if (state) {
      searchParams.set("state", state)
    }
    try {
      const payload: Partial<ChallengeRequestData> = {
        clientID,
        codeChallenge,
        codeChallengeMethod,
        redirectUri,
        responseType: "code",
        scope: selectedScopeList,
        state,
      }
      const response = await postFetch<ValidResponseData>(
        "/api/oauth/authorize",
        payload
      )
      searchParams.set("code", response.code)
    } catch (res: unknown) {
      // Redirect failure
      if (typeof res === "object" && res) {
        searchParams.append(
          "error",
          (await (res as Response).json())["error"] || "server_error"
        )
      } else {
        searchParams.append("error", "server_error")
      }
    }
    redirect(searchParams)
  }, [
    clientID,
    codeChallenge,
    codeChallengeMethod,
    redirect,
    redirectUri,
    selectedScopeList,
    state,
  ])

  const reject = async () => {
    setLoading(true)
    setButtonClicked("reject")
    redirect(new URLSearchParams([["error", "access_denied"]]))
  }

  useEffect(() => {
    const checkAppAuthorized = async () => {
      // if scopes are beyond the required ones, it is not safe to auto authorize
      if (scope.some((s) => !REQUIRED_SCOPE.includes(s))) {
        return
      }
      try {
        const apps = await getFetch<SerializedApp[]>("/api/apps/authorized")
        apps.forEach((a) => {
          if (a.client_id === app.client_id) {
            authorize()
          }
        })
      } catch (e) {
        console.error(e)
      }
    }

    checkAppAuthorized()
  }, [app.client_id, authorize, scope])

  if (!user) {
    return null
  }

  const updateSelectedScope = (scopeName: Scope) => (scopeValue: boolean) =>
    setSelectedScope({ ...selectedScope, [scopeName]: scopeValue })

  return (
    <>
      <div className="text-xs mb-4">
        <span className="font-bold">{app.name}</span>
        {`, por `}
        <span className="font-bold">{app.owner.name || app.owner.email}</span>
        {`, está pedindo permissão para:`}
      </div>
      <div className="mb-3 flex flex-col space-y-4 border-b pb-7 dark:border-slate-600">
        {scope.map((s) => (
          <Permission
            key={s}
            scope={s}
            value={selectedScope[s]}
            setValue={updateSelectedScope(s)}
          />
        ))}
      </div>
      <div className="flex flex-row items-center justify-between pt-4 space-x-4">
        <Button
          type="button"
          color="red"
          wide
          outline
          onClick={reject}
          disabled={loading && buttonClicked !== "reject"}
          loading={loading && buttonClicked === "reject"}>
          Rejeitar
        </Button>
        <Button
          type="button"
          color="blue"
          wide
          onClick={authorize}
          disabled={loading && buttonClicked !== "authorize"}
          loading={loading && buttonClicked === "authorize"}>
          Aceitar
        </Button>
      </div>
    </>
  )
}

export default UserAuthorization
