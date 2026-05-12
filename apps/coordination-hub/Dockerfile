# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the Coordination Hub.
# Pinned to node:20 (LTS) — matches CI engine pin per Phase 0 review I-2.

FROM node:20-bookworm-slim AS deps
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/coordination-hub/package.json apps/coordination-hub/
COPY contracts/package.json contracts/
COPY experiments/package.json experiments/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM node:20-bookworm-slim AS builder
WORKDIR /repo
RUN corepack enable
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/coordination-hub/node_modules ./apps/coordination-hub/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
RUN pnpm --filter @qr-bc/shared build && \
    pnpm --filter @qr-bc/coordination-hub build

FROM node:20-bookworm-slim AS runner
WORKDIR /repo
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 hub && \
    useradd --system --uid 1001 --gid hub hub
# pnpm-hoisted node_modules: per-app dirs are symlinks into the root
# /repo/node_modules/.pnpm tree, so the runner needs both. Preserve
# the monorepo layout so the symlinks resolve.
COPY --from=builder --chown=hub:hub /repo/node_modules /repo/node_modules
COPY --from=builder --chown=hub:hub /repo/apps/coordination-hub/node_modules /repo/apps/coordination-hub/node_modules
COPY --from=builder --chown=hub:hub /repo/apps/coordination-hub/dist /repo/apps/coordination-hub/dist
COPY --from=builder --chown=hub:hub /repo/packages/shared/dist /repo/packages/shared/dist
COPY --from=builder --chown=hub:hub /repo/packages/shared/package.json /repo/packages/shared/package.json
COPY --from=builder --chown=hub:hub /repo/packages/shared/node_modules /repo/packages/shared/node_modules
WORKDIR /repo/apps/coordination-hub
USER hub
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "dist/src/main.js"]
