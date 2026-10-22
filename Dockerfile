FROM --platform=$BUILDPLATFORM oven/bun:1.4.4-slim AS build

WORKDIR /build

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile

COPY tsconfig.json vite.config.ts ./
COPY src ./src
COPY static ./static

RUN bun run build

FROM joseluisq/static-web-server:2.44.1

LABEL org.opencontainers.image.title="Blitz Relay Dashboard"
LABEL org.opencontainers.image.description="A browser dashboard for monitoring and managing Blitz Relay servers"
LABEL org.opencontainers.image.licenses="MIT"

COPY LICENSE /LICENSE
COPY sws.toml /sws.toml
COPY --from=build /build/build /dashboard

USER 65534:65534

EXPOSE 8080
