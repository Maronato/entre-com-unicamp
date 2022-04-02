import type { NextConfig } from "next"

const config: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  swcMinify: true,
  images: {
    domains: ["cdn.entre-com-unicamp.com"],
  },
  rewrites: async () => [
    {
      source: "/oauth/token",
      destination: "/api/oauth/token",
    },
    {
      source: "/.well-known/jwks",
      destination: "/api/oauth/keys",
    },
  ],
}

export default config
