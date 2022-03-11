// next.config.ts
var config = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  swcMinify: true,
  images: {
    domains: ["tailwindui.com"]
  }
};
var next_config_default = config;
export {
  next_config_default as default
};
