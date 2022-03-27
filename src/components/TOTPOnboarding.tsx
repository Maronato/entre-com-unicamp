import { FormEventHandler, FunctionComponent, useEffect, useState } from "react"

import QRCode from "react-qr-code"
import useSWR from "swr"

import { getFetch, postFetch } from "@/utils/browser/fetch"
import { useAuth } from "@/utils/browser/hooks/useUser"
import { generateSecret, getSecretURL, verifyTOTP } from "@/utils/browser/totp"

import type { UserInfoResponse } from "@/pages/api/login/loginUserInfo"

import Button from "./Button"
import CopyValue from "./Developer/CopyValue"

const TOTPOnboarding: FunctionComponent = () => {
  const { user } = useAuth()
  const { data, error, mutate } = useSWR("/api/login/loginUserInfo", (url) =>
    getFetch<UserInfoResponse>(`${url}?email=${user?.email}`)
  )
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [secret, setSecret] = useState("")

  useEffect(() => {
    setSecret(generateSecret())
  }, [])

  useEffect(() => {
    setErrorMessage(undefined)
  }, [code])

  if (!user) {
    return null
  }

  if (error) {
    return <div>Error: {`Failed to load user info`}</div>
  }

  if (!data) {
    return <div>Loading...</div>
  }

  if (data.totpEnabled) {
    return <div>TOTP is already enabled</div>
  }

  const enableTOTP: FormEventHandler = async (e) => {
    e.preventDefault()
    setErrorMessage(undefined)
    const ok = await verifyTOTP(secret, code)

    if (ok) {
      setLoading(true)
      try {
        await postFetch(`/api/login/totp/enable`, { secret })
        mutate()
      } catch (e) {
        setErrorMessage("Falha ao habilitar o código TOTP")
      }
      setLoading(false)
    } else {
      setErrorMessage("Código inválido")
    }
  }

  const url = getSecretURL(user.email, secret)

  return (
    <form onSubmit={enableTOTP}>
      <div className="p-5 bg-white rounded w-min">
        <QRCode value={url} />
      </div>
      <CopyValue value={url} secret />
      <input onChange={(e) => setCode(e.target.value)} type="text" />
      <Button
        color="primary"
        type="submit"
        loading={loading}
        disabled={code.length < 6}>
        Habilitar
      </Button>
      {errorMessage && <div>{errorMessage}</div>}
    </form>
  )
}

export default TOTPOnboarding
