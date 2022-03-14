FROM node:16 AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN yarn global add pnpm
RUN pnpm install --prefer-frozen-lockfile --prod
RUN yarn prisma generate

FROM node:16 AS build-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY --from=prod-deps /app/node_modules ./node_modules
RUN yarn global add pnpm
RUN pnpm install --prefer-frozen-lockfile --prefer-offline

FROM node:16 AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY . .
COPY --from=build-deps /app/node_modules ./node_modules
RUN yarn build

# Production image, copy all the files and run next
FROM node:16 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma

COPY docker-entrypoint.sh docker-entrypoint.sh
ENTRYPOINT ["/app/docker-entrypoint.sh"]

EXPOSE 3000
HEALTHCHECK --interval=1m --timeout=5s \
  CMD curl --fail http://localhost:3000/api/health || exit 1

CMD ["yarn", "serve"]
