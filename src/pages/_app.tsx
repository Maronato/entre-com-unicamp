import { DefaultSeo } from "next-seo"
import Head from "next/head"
import { useRouter } from "next/router"

import { AnalyticsProvider } from "@/utils/browser/analytics"

import type { AppProps } from "next/app"

import "@/styles/globals.css"

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const origin = "https://local.maronato.dev"
  const url = `${origin}${router.pathname}`

  return (
    <>
      <Head>
        <title>Entre com Unicamp</title>
      </Head>
      <DefaultSeo
        titleTemplate="%s - Entre com Unicamp"
        defaultTitle="Entre com Unicamp"
        description="Um provedor de OAuth e OIDC para apps feitos por e para membros da Unicamp"
        openGraph={{
          url,
          type: "website",
          images: [
            {
              url: `${origin}/social/banner-wide.png`,
              width: 1200,
              height: 630,
              alt: "Entre com Unicamp",
            },
            {
              url: `${origin}/social/banner-short.png`,
              width: 1080,
              height: 1080,
              alt: "Entre com Unicamp",
            },
          ],
        }}
        twitter={{
          cardType: "summary_large_image",
        }}
      />
      <AnalyticsProvider>
        <Component {...pageProps} />
      </AnalyticsProvider>
    </>
  )
}

export default MyApp
