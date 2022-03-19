import type { NextConfig } from "next"

const config: NextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  swcMinify: true,
  images: {
    domains: ["tailwindui.com"],
  },
  rewrites: async () => [
    {
      source: "/oauth/token",
      destination: "/api/oauth/token",
    },
  ],
}

export default config
