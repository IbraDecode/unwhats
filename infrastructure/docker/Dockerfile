FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml turbo.json tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY services ./services
RUN pnpm install --frozen-lockfile

FROM deps AS build
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/services ./services
COPY --from=deps /app/package.json /app/pnpm-workspace.yaml /app/turbo.json /app/tsconfig.base.json ./
EXPOSE 3000
CMD ["node", "apps/api/dist/index.js"]
