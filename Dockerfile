# syntax=docker/dockerfile:1.7
# Hardened multi-stage images for the API and worker runtimes.
#
# Build API:    docker build --target api -t cvg-aud19-api:local .
# Build worker: docker build --target worker -t cvg-aud19-worker:local .
# Build web:    docker build --target web -t cvg-aud19-web:local .
# Notes:  run with --read-only --cap-drop=ALL --security-opt no-new-privileges
#         and mount a tmpfs at /tmp when the orchestrator supports it.
#
# Runtime tooling (contract docs/02_spec/aaa_quality_contract.md §6, Q-A18-03):
# the entrypoints execute TypeScript sources, so `tsx` stays a production
# dependency and `npm ci --omit=dev` keeps dev tooling out of the image. There
# is no compiled JavaScript emit today (tsconfig uses allowImportingTsExtensions
# and noEmit), so a compiled entrypoint would require a build rewrite first.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
COPY tsconfig.base.json tsconfig.json tsconfig.typecheck.json vite.config.mts ./
COPY apps ./apps
COPY packages ./packages
RUN npm ci --ignore-scripts && npm run build:web

FROM node:22-bookworm-slim AS runtime-base
ENV NODE_ENV=production NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
RUN groupadd --system --gid 10001 cvg \
  && useradd --system --uid 10001 --gid cvg --home-dir /app --shell /usr/sbin/nologin cvg
WORKDIR /app
# Install runtime dependencies only. The production bootstrap preflight module
# is imported by the worker entrypoint and must ship next to apps/packages.
COPY --chown=cvg:cvg package.json package-lock.json tsconfig.base.json ./
COPY --chown=cvg:cvg apps ./apps
COPY --chown=cvg:cvg packages ./packages
COPY --chown=cvg:cvg scripts/lib/production-preflight-core.mjs ./scripts/lib/production-preflight-core.mjs
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
USER cvg

FROM runtime-base AS api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/live').then((response)=>process.exit(response.ok?0:1)).catch(()=>process.exit(1))"
CMD ["./node_modules/.bin/tsx", "apps/api/src/main.ts"]

FROM runtime-base AS worker
# Readiness file is the default observable surface; the optional HTTP endpoint
# is bound to loopback only and stays disabled unless CVG_WORKER_HEALTH_PORT is
# set explicitly. Graceful drain runs on SIGTERM via the shared controller.
ENV CVG_WORKER_READINESS_FILE=/tmp/cvg-worker-ready
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD grep -q '"status":"ready"' /tmp/cvg-worker-ready || exit 1
CMD ["./node_modules/.bin/tsx", "apps/worker/src/main.ts"]

FROM nginxinc/nginx-unprivileged:1.27-alpine AS web
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx.web.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
