declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string
    JWT_PRIVATE_KEY?: string
    LOG_LEVEL?: string
    JAEGER_ENDPOINT?: string
    AWS_API_KEY?: string
    AWS_API_ENDPOINT?: string
    NEXT_PUBLIC_IMGUR_CLIENT_ID?: string
  }
}
