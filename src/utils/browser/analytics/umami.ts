import { createElement, useEffect } from "react"

import { useRouter } from "next/router"
import NextScript from "next/script"

import { Analytics, createProvider, ProviderScript } from "./context"

const UmamiScript: ProviderScript = ({ trackingID, trackingURL }) => {
  return createElement(NextScript, {
    src: trackingURL,
    id: "umami-script",
    strategy: "beforeInteractive",
    ...{
      "data-website-id": trackingID,
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
