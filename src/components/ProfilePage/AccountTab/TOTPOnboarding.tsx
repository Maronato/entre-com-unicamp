import { FormEventHandler, FunctionComponent, useEffect, useState } from "react"

import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/outline"
import QRCode from "react-qr-code"
import useSWR from "swr"

import Button from "@/components/Button"
import InputForm from "@/components/Forms/InputForm"
import CopyValue from "@/components/ProfilePage/DeveloperTab/CopyValue"
import { getFetch, postFetch } from "@/utils/browser/fetch"
import { useAuth } from "@/utils/browser/hooks/useUser"
import { generateSecret, getSecretURL, verifyTOTP } from "@/utils/browser/totp"

import type { UserInfoResponse } from "@/pages/api/login/loginUserInfo"

const TOTPOnboarding: FunctionComponent = () => {
  const { user } = useAuth()
  const { data, error, mutate } = useSWR("/api/login/loginUserInfo", (url) =>
    getFetch<UserInfoResponse>(`${url}?email=${user?.email}`)
  )
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [secret, setSecret] = useState("")
  const [loaded, setLoaded] = useState(false)

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
    return <div>Carregando...</div>
  }

  const reset = () => {
    setCode("")
    setErrorMessage(undefined)
    setLoaded(false)
    setSecret(generateSecret())
    setLoading(false)
  }

  const disableTOTP: FormEventHandler = async (e) => {
    e.preventDefault()
    setErrorMessage(undefined)

    setLoading(true)
    try {
      await postFetch(`/api/login/totp/disable`, { code })
      mutate()
      reset()
    } catch (e) {
      setErrorMessage("Falha ao desabilitar o código TOTP")
    }
    setLoading(false)
  }

  if (data.totpEnabled && !loaded) {
    return (
      <div className="flex flex-row items-center space-x-4">
        <div className="font-bold flex flex-row items-center">
          <ShieldCheckIcon className="h-6 w-6 text-green-500 mr-2" /> Habilitado
        </div>
        <Button
          color="red"
          outline
          onClick={() => setLoaded(true)}
          icon={ShieldExclamationIcon}>
          Desabilitar
        </Button>
      </div>
    )
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
        reset()
      } catch (e) {
        setErrorMessage("Falha ao habilitar o código TOTP")
      }
      setLoading(false)
    } else {
      setErrorMessage("Código inválido")
    }
  }

  const url = getSecretURL(user.email, secret)

  if (!loaded) {
    return (
      <Button
        color="primary"
        onClick={() => setLoaded(true)}
        icon={ShieldCheckIcon}>
        Habilitar
      </Button>
    )
  }

  if (data.totpEnabled) {
    return (
      <form onSubmit={disableTOTP}>
        <p className="mb-2">Digite o código atual para desabilitar</p>
        <div className="w-60 flex flex-row space-x-4 items-end">
          <InputForm
            htmlFor="one-time-code"
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
          />
          <Button
            color="red"
            type="submit"
            icon={ShieldExclamationIcon}
            loading={loading}
            disabled={code.length !== 6}>
            Desabilitar
          </Button>
        </div>
        {errorMessage && <div>{errorMessage}</div>}
      </form>
    )
  }

  return (
    <form onSubmit={enableTOTP}>
      <p className="mb-5">
        1. Escaneie o QR code usando seu gerador de códigos, ou cole o texto
        abaixo diretamente no gerador
      </p>
      <div className="p-5 bg-white rounded-lg shadow w-min mx-auto mb-5">
        <QRCode value={url} size={200} />
      </div>
      <CopyValue value={url} secret />
      <p className="mb-5 mt-10">
        2. Cole um dos códigos gerados no gerador abaixo para habilitar
      </p>
      <div className="w-60 mx-auto flex flex-row space-x-4 items-end">
        <InputForm
          htmlFor="one-time-code"
          onChange={(e) => setCode(e.target.value)}
          autoComplete="one-time-code"
          placeholder="123456"
          value={code}
        />
        <Button
          color="primary"
          type="submit"
          icon={ShieldCheckIcon}
          loading={loading}
          disabled={code.length !== 6}>
          Habilitar
        </Button>
      </div>
      {errorMessage && <div>{errorMessage}</div>}
    </form>
  )
}

export default TOTPOnboarding
