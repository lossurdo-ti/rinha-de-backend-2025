# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ---- runtime stage ----

FROM node:20-alpine AS runtime
WORKDIR /app

RUN corepack enable
ENV NODE_ENV=production
ENV PORT=9999

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/dist ./dist

EXPOSE 9999
CMD ["node", "dist/index.js"]
