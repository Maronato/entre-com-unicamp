import { FunctionComponent } from "react"

import useSWR, { SWRConfig } from "swr"

import { getFetch, postFetch } from "../fetch"

import type { SerializedUser } from "@/oauth2/user"

export const key = "user"

export type UserFallback = { [key]: SerializedUser<true> | null }

const clientFetch = () => getFetch<SerializedUser>("/api/me").catch(() => null)

export const useUser = () => {
  const { data, mutate, error } = useSWR(key, clientFetch)

  const loading = !data && !error

  return {
    loading,
    user: data,
    mutate,
  }
}

export const useAuth = () => {
  const { loading, mutate, user } = useUser()

  const sendEmailCode = async (email: string): Promise<boolean> => {
    try {
      await postFetch("/api/login/sendEmailCode", { email })
      return true
    } catch (e) {
      return false
    }
  }
  const login = async (email: string, code: string): Promise<boolean> => {
    try {
      const { user } = await postFetch<{ user: SerializedUser }>("/api/login", {
        email,
        code,
      })
      await mutate(user)
      return true
    } catch (e) {
      return false
    }
  }
  const logout = async (): Promise<void> => {
    await postFetch("/api/logout")
    await mutate(null)
  }

  return {
    user,
    loading,
    sendEmailCode,
    login,
    logout,
  }
}

export const UserProvicer: FunctionComponent<{ fallback: UserFallback }> = ({
  children,
  fallback,
}) => {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>
}
