# syntax=docker/dockerfile:1.7
# Contracts image. Two roles depending on which command compose runs:
#   - `pnpm exec hardhat node`: long-running local EVM JSON-RPC at :8545
#   - one-shot deploy + write address to /app/out/address.txt for the hub
#
# Built FROM the official foundry image (gives us forge/anvil/cast
# without re-running foundryup at every layer rebuild) plus node 20
# installed on top via apt for the hardhat-foundry plugin + ethers.

FROM ghcr.io/foundry-rs/foundry:v1.7.0 AS base
USER root
WORKDIR /app

# Foundry's image is debian-based — install Node 20 from NodeSource
# and pnpm via corepack. apt-get-non-interactive to keep image lean.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates git gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/* && \
    corepack enable

# Install monorepo deps so the hardhat plugin + ethers are present.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY contracts/package.json contracts/
COPY packages/shared/package.json packages/shared/
COPY apps/coordination-hub/package.json apps/coordination-hub/
COPY apps/management-portal/package.json apps/management-portal/
COPY apps/dapp-portal/package.json apps/dapp-portal/
COPY experiments/package.json experiments/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY contracts ./contracts
COPY packages/shared ./packages/shared
RUN pnpm --filter @qr-bc/shared build

# Pull forge-std submodule files baked in the build context (the
# .gitmodules entry points to remappings used by hardhat-foundry).
RUN cd contracts && (forge install --no-git foundry-rs/forge-std 2>/dev/null || true)

# Run as non-root for parity with hub/portal containers.
RUN groupadd --system --gid 1001 contracts && \
    useradd --system --uid 1001 --gid contracts -m contracts && \
    mkdir -p /app/out && chown -R contracts:contracts /app
USER contracts
EXPOSE 8545
WORKDIR /app/contracts
# Reset the foundry image's ENTRYPOINT (it sets ["/bin/sh", "-c"] which
# mangles compose's array `command:` into pnpm's help screen).
ENTRYPOINT []
CMD ["pnpm", "exec", "hardhat", "node", "--hostname", "0.0.0.0"]
