import type { NextConfig } from "next"

const config: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  swcMinify: true,
  images: {
    domains: ["i.imgur.com"],
  },
  rewrites: async () => [
    {
      source: "/oauth/token",
      destination: "/api/oauth/token",
    },
  ],
}

export default config
