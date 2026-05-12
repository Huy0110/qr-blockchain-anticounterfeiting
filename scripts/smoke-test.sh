#!/usr/bin/env bash
# scripts/smoke-test.sh — `docker compose up -d`, wait until every
# service reports healthy, hit the hub's /health endpoint, and
# `compose down`. Exit 0 only on a fully clean cycle.
#
# Used by `make demo` and the Phase 7 CI check.
set -euo pipefail

cd "$(dirname "$0")/.."

CYAN='\033[1;36m'
RED='\033[1;31m'
GREEN='\033[1;32m'
NC='\033[0m'

log()  { printf "${CYAN}==> %s${NC}\n" "$1"; }
fail() { printf "${RED}FAIL: %s${NC}\n" "$1" >&2; exit 1; }
ok()   { printf "${GREEN}OK:   %s${NC}\n" "$1"; }

cleanup() {
  log "Tearing down stack…"
  docker compose down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

log "docker compose config — validating YAML"
docker compose config --quiet || fail "compose config invalid"
ok "compose config"

log "docker compose up -d"
# 240s budget: management-portal's first-boot Next.js compile can
# take ~90 s on cold caches. Subsequent runs are much faster.
docker compose up -d --wait --wait-timeout 240 || fail "compose up did not become healthy in 240 s"

# Print the final service health snapshot for the run log.
log "Service health:"
docker compose ps

log "GET /api/v1/health"
HEALTH=$(curl -fsSL http://localhost:3000/api/v1/health || true)
[ -n "$HEALTH" ] || fail "/health returned empty body"
echo "$HEALTH" | head -c 200
ok "hub /health responded"

log "GET /vi/login (management portal)"
curl -fsSL -o /dev/null http://localhost:3001/vi/login || fail "management portal /vi/login unreachable"
ok "management portal serving"

log "GET /vi/ (dApp)"
curl -fsSL -o /dev/null http://localhost:3002/vi/ || fail "dApp /vi/ unreachable"
ok "dApp serving"

ok "smoke test passed"
