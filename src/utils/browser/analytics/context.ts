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

export const createProvider = (
  ctxFactory: () => Analytics,
  Script?: FunctionComponent
): FunctionComponent => {
  const AnalyticsProvider: FunctionComponent = ({ children }) => {
    if (!process.env.NEXT_PUBLIC_TRACKING_ID) {
      return createElement(Fragment, {}, children)
    }
    const ctx = ctxFactory()
    const script = Script ? createElement(Script, { key: "script" }) : null
    return createElement(context.Provider, { value: ctx }, [script, children])
  }
  return AnalyticsProvider
}
