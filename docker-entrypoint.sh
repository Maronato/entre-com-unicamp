#!/bin/sh
set -e

cd /app
yarn node dist/prisma/seed.js

exec "$@"
