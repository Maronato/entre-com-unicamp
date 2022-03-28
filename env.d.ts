declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string
    JWT_PRIVATE_KEY?: string
    LOG_LEVEL?: string
    JAEGER_ENDPOINT?: string
    AWS_API_KEY?: string
    AWS_API_ENDPOINT?: string
    AWS_S3_ACCESS_KEY_ID?: string
    AWS_S3_SECRET_ACCESS_KEY?: string
    AWS_S3_BUCKET_NAME?: string
  }
}
