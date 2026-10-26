FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ARG STATIC_BACKEND_URL=http://smartchangebackend.web:8080/
ENV STATIC_BACKEND_URL=${STATIC_BACKEND_URL}
# Environment-specific toggle consumed by the SvelteKit backend routes
ARG APP_ENV=prod
ENV APP_ENV=${APP_ENV}
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS builder
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build
RUN pnpm prune --production

FROM base as production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4200
WORKDIR /app
COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json .
EXPOSE 4200
CMD [ "node", "build" ]
