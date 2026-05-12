#!/usr/bin/env bash
# render-mermaid.sh — extract the C4 mermaid blocks from
# docs/ARCHITECTURE.md and render each to docs/images/*.{svg,png}.
#
# Usage: scripts/render-mermaid.sh
#
# Requires: pnpm (uses pnpm dlx to fetch @mermaid-js/mermaid-cli).
# The renderer launches headless Chromium via puppeteer. On Linux CI
# you may need: `apt-get install -y libnss3 libatk-bridge2.0-0 ...`.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_ROOT/docs/ARCHITECTURE.md"
OUT_DIR="$REPO_ROOT/docs/images"
mkdir -p "$OUT_DIR"

# Names in stable order matching the 3 mermaid blocks in ARCHITECTURE.md.
NAMES=(architecture-context architecture-container architecture-component)

# Split ARCHITECTURE.md on ```mermaid fences and write each block to
# docs/images/<name>.mmd. Awk state machine: when we see ```mermaid we
# start capturing; when we see the closing ``` we flush to the next file.
awk -v out_dir="$OUT_DIR" -v names="${NAMES[*]}" '
  BEGIN { split(names, n, " "); idx = 0; capturing = 0 }
  /^```mermaid/ { idx++; capturing = 1; target = out_dir "/" n[idx] ".mmd"; next }
  /^```/ && capturing { capturing = 0; next }
  capturing { print > target }
' "$SRC"

if [[ ! -s "$OUT_DIR/${NAMES[0]}.mmd" ]]; then
  echo "ERROR: no mermaid blocks extracted from $SRC" >&2
  exit 1
fi

# Pinned mermaid-cli version: 11.x is stable + supports the C4 mermaid
# diagrams used in ARCHITECTURE.md. Pin so the rendered output is
# byte-stable across reviewer environments.
PCONF="$REPO_ROOT/scripts/.puppeteer-config.json"
MMDC=(npx --yes -p @mermaid-js/mermaid-cli@11.4.0 mmdc -p "$PCONF")

for name in "${NAMES[@]}"; do
  src="$OUT_DIR/$name.mmd"
  echo "==> Rendering $name → svg + png"
  "${MMDC[@]}" -i "$src" -o "$OUT_DIR/$name.svg" -b transparent
  "${MMDC[@]}" -i "$src" -o "$OUT_DIR/$name.png" -b white -w 1600
done

# Strip the intermediate .mmd files — the markdown is the source of
# truth; keeping them around invites drift.
rm -f "$OUT_DIR"/*.mmd

echo "==> Done. Rendered:"
ls -lh "$OUT_DIR"/*.svg "$OUT_DIR"/*.png
