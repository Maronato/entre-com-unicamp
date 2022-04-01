import { createElement, FunctionComponent, useEffect } from "react"

import { useRouter } from "next/router"
import NextScript from "next/script"

import { Analytics, createProvider } from "./context"

const UmamiScript: FunctionComponent = () => {
  const id = process.env.NEXT_PUBLIC_TRACKING_ID
  const src = process.env.NEXT_PUBLIC_TRACKING_URL
  return createElement(NextScript, {
    src,
    id: "umami-script",
    strategy: "beforeInteractive",
    ...{
      "data-website-id": id,
      "data-auto-track": "false",
      "data-do-not-track": "true",
    },
  })
}
type Umami = {
  trackEvent: (value: string, type: string, url?: string, id?: string) => void
  trackView: (url: string, referrer?: string, id?: string) => void
}

declare global {
  interface Window {
    umami?: Umami
  }
}

const tracker: Analytics = {
  event: (name, type) => {
    const umami = window?.umami
    if (umami) {
      umami.trackEvent(name, type || "custom", location.pathname)
    }
  },
  pageview: () => {
    const umami = window?.umami
    if (umami) {
      umami.trackView(location.pathname)
    }
  },
}

export const UmamiProvider = createProvider(() => {
  const router = useRouter()

  useEffect(() => {
    tracker.pageview()
    router.events.on("routeChangeComplete", tracker.pageview)
    return () => {
      router.events.off("routeChangeComplete", tracker.pageview)
    }
  }, [router.events])

  return tracker
}, UmamiScript)
