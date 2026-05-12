# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the Consumer dApp.
# Static-exports `out/` and serves it via a tiny Node static server. The
# real production target is IPFS (see ipfs-deploy.sh) — this image is
# for `make demo` and developer reproduction.

FROM node:20-bookworm-slim AS builder
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/dapp-portal/package.json apps/dapp-portal/
COPY apps/management-portal/package.json apps/management-portal/
COPY apps/coordination-hub/package.json apps/coordination-hub/
COPY contracts/package.json contracts/
COPY experiments/package.json experiments/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @qr-bc/shared build && \
    pnpm --filter @qr-bc/dapp-portal build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
RUN groupadd --system --gid 1001 dapp && \
    useradd --system --uid 1001 --gid dapp dapp
COPY --from=builder --chown=dapp:dapp /repo/apps/dapp-portal/out ./out
COPY --from=builder --chown=dapp:dapp /repo/apps/dapp-portal/test/serve-static.cjs ./serve-static.cjs
USER dapp
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/vi/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "serve-static.cjs", "out", "3002"]
