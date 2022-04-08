import Head from "next/head"

import { AnalyticsProvider } from "@/utils/browser/analytics"

import type { AppProps } from "next/app"

import "@/styles/globals.css"

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Entre com Unicamp</title>
      </Head>
      <AnalyticsProvider>
        <Component {...pageProps} />
      </AnalyticsProvider>
    </>
  )
}

export default MyApp
