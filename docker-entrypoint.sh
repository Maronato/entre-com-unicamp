#!/bin/sh
set -e

cd /app
yarn ts-node --project tsconfig.server.json prisma/seed.ts

exec "$@"
