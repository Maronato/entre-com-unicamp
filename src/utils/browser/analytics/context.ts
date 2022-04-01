import {
  createContext,
  createElement,
  Fragment,
  FunctionComponent,
  useContext,
} from "react"

export type Analytics = {
  pageview: () => void
  event: (name: string, type?: string) => void
}

const context = createContext<Analytics>({
  event: () => {},
  pageview: () => {},
})

export const useAnalytics = () => {
  return useContext(context)
}

export type ProviderScript = FunctionComponent<{
  trackingID: string
  trackingURL: string
}>

export const createProvider = (
  ctxFactory: () => Analytics,
  Script?: ProviderScript
): FunctionComponent => {
  const AnalyticsProvider: FunctionComponent = ({ children }) => {
    const trackingID =
      process.env.NEXT_PUBLIC_TRACKING_ID ??
      process.env.NODE_ENV === "production"
        ? "3d7ff0b0-048d-49da-8602-0b5dab8acd19"
        : undefined
    const trackingURL =
      process.env.NEXT_PUBLIC_TRACKING_URL ??
      process.env.NODE_ENV === "production"
        ? "https://analytics.maronato.dev/script.js"
        : undefined
    if (!trackingID || !trackingURL) {
      return createElement(Fragment, {}, children)
    }
    const ctx = ctxFactory()
    const script = Script
      ? createElement(Script, { key: "script", trackingID, trackingURL })
      : null
    return createElement(context.Provider, { value: ctx }, [script, children])
  }
  return AnalyticsProvider
}
