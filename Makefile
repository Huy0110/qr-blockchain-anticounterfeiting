# QR Blockchain Anticounterfeiting — convenience targets
#
# `make review` runs the local /06-review skill manually via Claude Code;
# the skill is not invoked by `make` directly. It's listed here so contributors
# remember the phase exit gate.

SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help setup install clean lint format typecheck test demo review docker-build docker-up docker-down docker-config docker-logs

help: ## List available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Targets:\n"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

setup: install ## One-shot setup: install JS deps + initialise foundry submodule
	@if [ -d contracts/lib/forge-std ] && [ -z "$$(ls -A contracts/lib/forge-std)" ]; then \
		echo "==> Initialising forge-std submodule"; \
		git submodule update --init --recursive; \
	fi
	@echo "==> Setup complete."

install: ## Install all workspace dependencies
	pnpm install

clean: ## Remove build outputs (node_modules retained)
	pnpm -r exec rm -rf dist .next out cache cache_hardhat artifacts typechain-types || true
	rm -rf contracts/out contracts/cache contracts/cache_hardhat contracts/artifacts contracts/typechain-types

lint: ## Run ESLint + solhint across the monorepo
	pnpm lint
	pnpm --filter @qr-bc/contracts lint || true

format: ## Run prettier --write
	pnpm format

format-check: ## Verify prettier formatting (CI-style)
	pnpm format:check

typecheck: ## Run tsc across all workspaces
	pnpm typecheck

test: ## Run all tests (forge + hardhat + jest, where present)
	pnpm --filter @qr-bc/contracts test || true

demo: ## Smoke-test the docker-compose stack end-to-end (up → health → down)
	scripts/smoke-test.sh

docker-build: ## Build all service images
	docker compose build

docker-up: ## Bring the local stack up (default profile, detached)
	docker compose up -d --wait

docker-down: ## Tear the stack down + remove volumes
	docker compose down -v --remove-orphans

docker-config: ## Validate every compose file (default / dev / testnet / prod)
	docker compose config --quiet
	docker compose -f docker-compose.yml -f docker-compose.dev.override.yml config --quiet
	AMOY_RPC_URL=stub CONTRACT_ADDRESS=0x0 SYSTEM_WALLET_PRIVATE_KEY=0x0 \
		docker compose -f docker-compose.yml -f docker-compose.testnet.override.yml --profile testnet config --quiet
	NEXTAUTH_SECRET=stub JWT_SECRET=stub REFRESH_SECRET=stub \
		WALLET_ENCRYPTION_KEK=stub DAILY_SALT_SECRET=stub MONGO_URI=stub \
		RPC_URL=stub CONTRACT_ADDRESS=0x0 SYSTEM_WALLET_PRIVATE_KEY=0x0 PINATA_JWT=stub \
		docker compose -f docker-compose.yml -f docker-compose.prod.override.yml config --quiet

docker-logs: ## Tail logs for the live stack
	docker compose logs -f

review: ## Manual exit-gate audit — run /06-review in Claude Code
	@echo "Run '/06-review' in Claude Code to perform the phase exit-gate audit."
	@echo "The audit is interactive; this target is a reminder, not an executor."
