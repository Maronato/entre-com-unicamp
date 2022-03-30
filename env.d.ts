declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string
    JWT_PRIVATE_KEY?: string
    LOG_LEVEL?: string
    JAEGER_ENDPOINT?: string

    // AWS secrets
    AWS_API_KEY?: string
    AWS_API_ENDPOINT?: string
    AWS_S3_ACCESS_KEY_ID?: string
    AWS_S3_SECRET_ACCESS_KEY?: string
    AWS_S3_BUCKET_NAME?: string

    // Docker labels
    DOCKER_SERVICE_ID?: string
    DOCKER_SERVICE_NAME?: string
    DOCKER_SERVICE_LABELS?: string
    DOCKER_NODE_ID?: string
    DOCKER_NODE_HOSTNAME?: string
    DOCKER_TASK_ID?: string
    DOCKER_TASK_NAME?: string
    DOCKER_TASK_SLOT?: string
  }
}
