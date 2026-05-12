# Release pipeline

This document describes what happens when a maintainer pushes a `vX.Y.Z`
annotated tag to `main`. The pipeline is implemented in
[`.github/workflows/release.yml`](../.github/workflows/release.yml) and
the helper script
[`apps/dapp-portal/ipfs-deploy.sh`](../apps/dapp-portal/ipfs-deploy.sh).

## Trigger

- Annotated tag matching `v*.*.*` (e.g. `v1.0.0`) → **stable release**.
- Annotated tag matching `v*.*.*-*` (e.g. `v0.1.0-test`) → **pre-release**:
  - The GitHub Release is marked `prerelease: true`.
  - The dApp is pinned to Pinata's **sandbox** account (`PINATA_JWT_SANDBOX`)
    instead of production.

The dual-tag scheme lets us rehearse the full pipeline against a sandbox
deposit before the public `v1.0.0` cut.

## Steps

1. **Checkout** with `fetch-depth: 0` so CHANGELOG history is available.
2. **Build the dApp static export** via
   `pnpm --filter @qr-bc/dapp-portal build` (next.js `output: 'export'`
   emits `apps/dapp-portal/out/`).
3. **Pin to Pinata.** `ipfs-deploy.sh` walks `out/` and uploads every
   file as a multipart `pinFileToIPFS` request. On success it prints a
   machine-readable line `RELEASE_CID=<cid>` that the workflow parses.
4. **Extract CHANGELOG entry** for this tag using `awk` to slice the
   section between the matching `## [vX.Y.Z]` heading and the next
   `## ` heading. If no entry is found, release notes fall back to
   `"Release <tag>"`.
5. **Create GitHub Release** via `softprops/action-gh-release@v2` with
   the CHANGELOG body + a footer listing the IPFS CID and gateway URL.

## Zenodo integration

Zenodo has a native GitHub integration that fires on every published
GitHub Release. The wiring is done **once, manually** in the Zenodo
dashboard:

1. Sign in to <https://zenodo.org/account/settings/github/> with the
   account that will own the DOI series.
2. Toggle the repository `Huy0110/qr-blockchain-anticounterfeiting`
   to **on**.
3. From the next release onwards, Zenodo will:
   - Download the source tarball attached to the GitHub Release.
   - Parse [`CITATION.cff`](../CITATION.cff) and
     [`.zenodo.json`](../.zenodo.json) for metadata (authors, title,
     license, keywords).
   - Mint a new DOI and append it to the concept DOI series.

For the **sandbox rehearsal** the same wiring is done at
<https://sandbox.zenodo.org/account/settings/github/>. The sandbox DOI
will be used in the `v0.0.1-test` dry run before `v1.0.0`.

> **Status:** `CITATION.cff` and `.zenodo.json` are scheduled for
> [T-045 (Phase 10)](tasks/phase-10-branding-seed-citation.md#t-045);
> until they land, Zenodo will fall back to GitHub repository metadata
> only. Do **not** cut `v1.0.0` before T-045 ships, or the canonical DOI
> will be minted without proper author attribution.

## Required secrets

| Secret               | Purpose               | Required for         |
| -------------------- | --------------------- | -------------------- |
| `PINATA_JWT`         | Production Pinata JWT | stable `vX.Y.Z` tags |
| `PINATA_JWT_SANDBOX` | Sandbox Pinata JWT    | `*-test` tags        |

If neither secret is set, the workflow logs a warning and proceeds
without a pin (`cid=skipped` in the release notes) — useful for
documentation-only releases.

## Dry-run locally

```sh
# Build only, estimate pin size, do not upload:
apps/dapp-portal/ipfs-deploy.sh --dry

# Pin against the sandbox account from your laptop:
PINATA_JWT=$PINATA_JWT_SANDBOX apps/dapp-portal/ipfs-deploy.sh
```
