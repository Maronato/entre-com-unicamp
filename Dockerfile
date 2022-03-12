FROM node:16-alpine AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN yarn global add pnpm
RUN pnpm install --prefer-frozen-lockfile --prod

FROM node:16-alpine AS build-deps
WORKDIR /app
COPY package.json yarn.lock ./
COPY --from=prod-deps /app/node_modules ./node_modules
RUN yarn global add pnpm
RUN pnpm config set enable-pre-post-scripts true
RUN pnpm install --prefer-frozen-lockfile

FROM node:16-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY . .
COPY --from=build-deps /app/node_modules ./node_modules
RUN yarn global add pnpm
RUN pnpm config set enable-pre-post-scripts true
RUN pnpx prisma generate
RUN pnpm run build

# Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
RUN yarn global add pnpm
RUN pnpm config set enable-pre-post-scripts true
RUN yarn prisma generate
CMD ["pnpm", "run", "serve"]
