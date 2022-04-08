import Head from "next/head"
import { useRouter } from "next/router"

import { AnalyticsProvider } from "@/utils/browser/analytics"

import type { AppProps } from "next/app"

import "@/styles/globals.css"

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://entre-com-unicamp.com"
  const url = `${origin}${router.pathname}`
  return (
    <>
      <Head>
        <title key="title">Entre com Unicamp</title>
        <link key="favicon" rel="icon" href="/favicon.ico" />
        <meta key="robots" name="robots" content="index,follow" />
        <meta
          key="description"
          name="description"
          content="Um provedor de OAuth e OIDC para apps feitos por e para membros da Unicamp"
        />
        <meta
          key="twitter:card"
          name="twitter:card"
          content="summary_large_image"
        />
        <meta key="og:title" property="og:title" content="Entre com Unicamp" />
        <meta
          key="og:description"
          property="og:description"
          content="Um provedor de OAuth e OIDC para apps feitos por e para membros da Unicamp"
        />
        <meta key="og:type" property="og:type" content="website" />
        <meta
          key="og:image-wide"
          property="og:image"
          content={`${origin}/social/banner-wide.png`}
        />
        <meta
          key="og:image-wide:alt"
          property="og:image:alt"
          content="Entre com Unicamp"
        />
        <meta
          key="og:image-wide:width"
          property="og:image:width"
          content="1200"
        />
        <meta
          key="og:image-wide:height"
          property="og:image:height"
          content="630"
        />
        <meta
          key="og:image-short"
          property="og:image"
          content={`${origin}/social/banner-short.png`}
        />
        <meta
          key="og:image-short:alt"
          property="og:image:alt"
          content="Entre com Unicamp"
        />
        <meta
          key="og:image-short:width"
          property="og:image:width"
          content="1080"
        />
        <meta
          key="og:image-short:height"
          property="og:image:height"
          content="1080"
        />
        <meta key="og:urlt" property="og:url" content={url} />
      </Head>
      <AnalyticsProvider>
        <Component {...pageProps} />
      </AnalyticsProvider>
    </>
  )
}

export default MyApp
