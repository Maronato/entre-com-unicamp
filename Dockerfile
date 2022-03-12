FROM node:16 AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN yarn global add pnpm
RUN pnpm install --prefer-frozen-lockfile --prod

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
RUN yarn prisma generate
RUN yarn build

# Production image, copy all the files and run next
FROM node:16 AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
CMD ["yarn", "serve"]
