# syntax=docker/dockerfile:1.7
# Hardened multi-stage image for the API runtime.
# Build:  docker build -t cvg-agent-secretary:local .
# Notes:  run with --read-only --cap-drop=ALL --security-opt no-new-privileges
#         and mount a tmpfs at /tmp when the orchestrator supports it.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
COPY tsconfig.base.json tsconfig.json tsconfig.typecheck.json vite.config.mts ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --ignore-scripts && npm run build:web

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
RUN groupadd --system --gid 10001 cvg \
  && useradd --system --uid 10001 --gid cvg --home-dir /app --shell /usr/sbin/nologin cvg
WORKDIR /app
COPY --from=build --chown=cvg:cvg /app/node_modules ./node_modules
COPY --from=build --chown=cvg:cvg /app/package.json ./package.json
COPY --from=build --chown=cvg:cvg /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build --chown=cvg:cvg /app/apps ./apps
COPY --from=build --chown=cvg:cvg /app/packages ./packages
USER cvg
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/live').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npx", "tsx", "apps/api/src/main.ts"]
