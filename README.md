# Entre com Unicamp

## Local development
To run locally, you need Docker, Node 16.x and pnpm

First, create a file named `.env` on the root directory of the project with the following contents:
```
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"
```

1. Install dependencies with `pnpm install`
2. Start supporting containers with `docker compose --file ./dev/docker-compose.yml up -d`
3. Wait for the containers to converge
4. Migrate the database with `yarn prisma db push`
5. Generate the prisma client with `yarn prisma generate`
6. Start the dev server with `yarn dev`

## Supporting services
In development, the supporting services are available at these locations:

- `prometheus`: http://localhost:9090
- `jaeger`: http://localhost:16686
- `minio`: http://localhost:9001 (user: `minio_user`, password: `minio_password`)
- `postgres`: postgres://postgres:postgres@localhost:5432
- `redis`: redis://localhost:6379

## Env configs
These are the available environment variables

- `DATABASE_URL`: Postgres db url
- `JWT_PRIVATE_KEY `: ES256 private key as string
- `LOG_LEVEL `: Log level
- `JAEGER_ENDPOINT `: Tracing collector endpoint
- `AWS_API_KEY `: SES API key for sending email codes
- `AWS_API_ENDPOINT`: SES API endpoint for sending email codes
- `AWS_S3_ACCESS_KEY_ID`: S3 access key
- `AWS_S3_SECRET_ACCESS_KEY`: S3 secret key
- `AWS_S3_BUCKET_NAME`: S3 bucket name
- `AWS_S3_REGION`: S3 region
- `CDN_HOST`: Production CDN host

## Generating private keys
Although not needed for development, you should enable it in production. Generate new key strings with:

```ts
import jose from "jose"

const newKey = JSON.stringify(await jose.exportJWK((await jose.generateKeyPair("ES256")).privateKey))
console.log(newKey)
```
