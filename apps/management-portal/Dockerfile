# syntax=docker/dockerfile:1.7
# Multi-stage Dockerfile for the Management Portal.
# node:20-bookworm-slim per ADR-005 (avoids alpine musl libc edge cases).

FROM node:20-bookworm-slim AS deps
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/management-portal/package.json apps/management-portal/
COPY apps/coordination-hub/package.json apps/coordination-hub/
COPY apps/dapp-portal/package.json apps/dapp-portal/
COPY contracts/package.json contracts/
COPY experiments/package.json experiments/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM node:20-bookworm-slim AS builder
WORKDIR /repo
RUN corepack enable
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/management-portal/node_modules ./apps/management-portal/node_modules
COPY --from=deps /repo/packages/shared/node_modules ./packages/shared/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @qr-bc/shared build && \
    pnpm --filter @qr-bc/management-portal build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN groupadd --system --gid 1001 nextjs && \
    useradd --system --uid 1001 --gid nextjs nextjs
# Next.js standalone output bundles everything except the static folder
# and public/. Copy in that exact layout so `node server.js` boots.
COPY --from=builder --chown=nextjs:nextjs /repo/apps/management-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /repo/apps/management-portal/.next/static ./apps/management-portal/.next/static
COPY --from=builder --chown=nextjs:nextjs /repo/apps/management-portal/public ./apps/management-portal/public
USER nextjs
EXPOSE 3001
ENV PORT=3001
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/vi/login', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"
CMD ["node", "apps/management-portal/server.js"]
