FROM node:16-slim AS base
RUN apt-get update
RUN apt-get install -y openssl

FROM base AS prod-deps
WORKDIR /app
ENV NODE_ENV=production
RUN echo "strict-peer-dependencies=false" > .npmrc
COPY package.json yarn.lock ./
RUN npm set-script prepare "" && yarn install --frozen-lockfile --production
COPY prisma ./prisma
RUN yarn prisma generate

FROM base AS build-deps
WORKDIR /app
RUN echo "strict-peer-dependencies=false" > .npmrc
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --prefer-offline

FROM base AS builder
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN rm -rdf node_modules
COPY --from=build-deps /app/node_modules ./node_modules
RUN yarn build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app
RUN apt-get update && apt-get install curl -y
ENV NODE_ENV=production
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma

EXPOSE 3000
HEALTHCHECK --interval=1m --timeout=5s \
  CMD curl --fail http://localhost:3000/api/health || exit 1

CMD ["yarn", "serve"]
