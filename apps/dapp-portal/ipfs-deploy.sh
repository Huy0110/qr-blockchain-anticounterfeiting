#!/usr/bin/env bash
# ipfs-deploy.sh — build the dApp + pin the static `out/` to Pinata.
#
# Usage:
#   PINATA_JWT=<jwt> ./ipfs-deploy.sh
#   ./ipfs-deploy.sh --dry        (build only; estimate the pin size, no upload)
#
# Requires: pnpm, curl. Pin size estimate uses `du -sb` on the output.
set -euo pipefail

cd "$(dirname "$0")"

DRY=false
if [[ "${1:-}" == "--dry" ]]; then
  DRY=true
fi

echo "==> Building dApp (next build with output: 'export')..."
pnpm --filter @qr-bc/dapp-portal build

OUT_DIR="$(pwd)/out"
if [[ ! -d "$OUT_DIR" ]]; then
  echo "ERROR: out/ not found after build. Did next build succeed?" >&2
  exit 1
fi

SIZE_BYTES=$(du -sk "$OUT_DIR" | awk '{print $1 * 1024}')
SIZE_HUMAN=$(du -sh "$OUT_DIR" | awk '{print $1}')
HTML_COUNT=$(find "$OUT_DIR" -name "*.html" | wc -l | tr -d ' ')
echo "==> Output ready:"
echo "    path:  $OUT_DIR"
echo "    size:  ${SIZE_HUMAN} (${SIZE_BYTES} bytes)"
echo "    pages: ${HTML_COUNT} HTML files"

if [[ "$DRY" == "true" ]]; then
  echo "==> Dry run requested; estimated pin size only. Skipping upload."
  exit 0
fi

if [[ -z "${PINATA_JWT:-}" ]]; then
  echo "ERROR: PINATA_JWT env var not set. Either export it or re-run with --dry." >&2
  exit 1
fi

echo "==> Pinning out/ to Pinata..."
# Pinata's pinFileToIPFS endpoint accepts a multipart upload of every file
# in a directory. We invoke it via curl + a tar pipe to stay tool-light.
TAR_TMP=$(mktemp -d)
PIN_NAME="qr-bc-dapp-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')-$(date -u +%Y%m%dT%H%M%SZ)"

(
  cd "$OUT_DIR"
  for f in $(find . -type f); do
    rel="${f#./}"
    cp --parents "$rel" "$TAR_TMP" 2>/dev/null || cp "$rel" "$TAR_TMP/$rel"
  done
)

UPLOAD_ARGS=()
while IFS= read -r -d '' file; do
  rel="${file#$TAR_TMP/}"
  UPLOAD_ARGS+=(-F "file=@${file};filename=${rel}")
done < <(find "$TAR_TMP" -type f -print0)

UPLOAD_ARGS+=(-F "pinataMetadata={\"name\":\"$PIN_NAME\"}")
UPLOAD_ARGS+=(-F "pinataOptions={\"wrapWithDirectory\":true}")

CID_RESPONSE=$(curl -sS -X POST \
  -H "Authorization: Bearer $PINATA_JWT" \
  "${UPLOAD_ARGS[@]}" \
  "https://api.pinata.cloud/pinning/pinFileToIPFS")

rm -rf "$TAR_TMP"

CID=$(echo "$CID_RESPONSE" | sed -n 's/.*"IpfsHash":"\([^"]*\)".*/\1/p')
if [[ -z "$CID" ]]; then
  echo "ERROR: Pinata response did not include IpfsHash:" >&2
  echo "$CID_RESPONSE" >&2
  exit 1
fi

echo "==> Pinned!"
echo "    CID:  $CID"
echo "    URL:  https://${CID}.ipfs.dweb.link/vi/"
echo "    URL:  https://gateway.pinata.cloud/ipfs/${CID}/vi/"

# Stable machine-readable line for CI to grep against. The release.yml
# workflow anchors on this so changes to the human-readable output
# above can't accidentally shift the parser onto a wrong CID.
echo "RELEASE_CID=${CID}"
