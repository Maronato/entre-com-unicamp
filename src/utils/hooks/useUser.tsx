import { FunctionComponent } from "react"

import { GetServerSideProps } from "next"
import useSWR, { SWRConfig } from "swr"

import { isAuthenticated } from "../auth/server"
import { getFetch, postFetch } from "../fetch"

import type { ResourceOwner } from "@/oauth2/resourceOwner"

const key = "user"

export type UserFallback = { [key]: ReturnType<ResourceOwner["toJSON"]> | null }

const clientFetch = () => getFetch<ResourceOwner>("/api/me").catch(() => null)

export const serverFetch = async (
  req: Parameters<GetServerSideProps>[0]["req"]
): Promise<UserFallback> => {
  const user = (await isAuthenticated(req)) || null
  return {
    [key]: user ? user[0].toJSON(true) : user,
  }
}

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
      const { user } = await postFetch<{ user: ResourceOwner }>("/api/login", {
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
