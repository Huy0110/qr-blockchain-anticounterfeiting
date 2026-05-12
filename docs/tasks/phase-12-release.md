# Phase 12 — Release v1.0.0 + Zenodo DOI

**Goal:** Public DOI minted on Zenodo; paper footnotes updated; resubmission ready.
**Effort:** ~0.5 day total (2 tickets).
**Prerequisites:** All previous phases.

---

### T-047 — First push to GitHub Huy0110 + test tag `v0.0.1-test` + Zenodo sandbox

**Phase:** 12 · **Feature:** release · **Effort:** S

**Description.** **First push to GitHub.** Up to this point all commits are local (per T-001 policy). Now: create the public GitHub repo, push entire local history, validate release pipeline end-to-end on a sandbox tag before the real v1.0.0.

**Files to create/modify:**

- (No new files; this is an operational ticket)

**Acceptance criteria refs:** AC-CI-6
**ADRs:** ADR-005 (Pinata pinning), ADR-012
**Depends on:** T-039 (release.yml ready), all earlier tickets done.
**Definition of Done:**

- [ ] **Pre-flight (local):** `git log --oneline | wc -l` shows full project history; `git remote -v` empty; working tree clean.
- [ ] **GitHub repo created:** `gh repo create Huy0110/qr-blockchain-anticounterfeiting --public --description "..." --source=. --remote=origin` (token from `journal_1/github_token.txt`, NEVER echoed). Verify via `https://github.com/Huy0110/qr-blockchain-anticounterfeiting`.
- [ ] **First push:** `git push -u origin main` succeeds; entire history visible on GitHub.
- [ ] **CI runs on push:** `contracts-ci.yml` + `apps-ci.yml` + `gitleaks.yml` all green on `main` HEAD.
- [ ] **Required secrets configured** in GitHub repo settings: `CODECOV_TOKEN`, `PINATA_JWT`. Zenodo uses GitHub OAuth, no secret needed.
- [ ] **Zenodo GitHub integration enabled:** at https://zenodo.org/account/settings/github/ flip the toggle for this repo.
- [ ] Push test tag `git tag v0.0.1-test && git push origin v0.0.1-test` triggers `release.yml`.
- [ ] release.yml builds dApp static export and pins to Pinata sandbox; CID recorded in run logs.
- [ ] Zenodo **sandbox** integration mints a sandbox DOI (verify via Zenodo sandbox UI).
- [ ] GitHub release notes include CID + sandbox DOI URL.
- [ ] Tag `v0.0.1-test` deleted afterwards (`git tag -d` + `git push origin :refs/tags/v0.0.1-test`).
- [ ] Document any issues found and fix before T-048.

---

### T-048 — Tag `v1.0.0` + DOI mint + paper footnote update

**Phase:** 12 · **Feature:** release · **Effort:** S

**Description.** The real release. Mint DOI, update CITATION.cff + README + paper TeX, open PR on paper repo.

**Files to create/modify:**

- (Post-release commits to update DOI placeholders)
- `CITATION.cff` — fill `doi:` and `preferred-citation.doi:` (when available)
- `README.md` — replace DOI placeholder badge with real DOI
- `apps/dapp-portal/.env.production` — set `NEXT_PUBLIC_PAPER_DOI` (re-deploy not strictly needed since CID changes; final dApp may keep DOI in About page via env var)
- (Paper repo) `qr_code_new_2026_02/frontiers.tex` — replace 2 footnotes at lines 767 + 849: `Repository URL to be provided upon acceptance` → real GitHub URL + DOI

**Acceptance criteria refs:** AC-CT-4
**ADRs:** —
**SR/R mapping:** Editor's blocking ask (open access + DOI)
**Depends on:** T-047.
**Definition of Done:**

- [ ] (Repo already on GitHub from T-047.)
- [ ] Tag `v1.0.0` created locally + pushed: `git tag -a v1.0.0 -m "..." && git push origin v1.0.0`.
- [ ] release.yml succeeds; Pinata pin returns final CID; GitHub release notes contain CID and "Zenodo DOI: pending".
- [ ] Zenodo (real) mints DOI; verify by clicking Zenodo URL in release notes.
- [ ] Post-release PR (`docs(release): record v1.0.0 DOI`) updates CITATION.cff + README + dApp env.
- [ ] PR opened against paper repo (`huypd-0316/...`) replacing 2 footnotes with real GitHub URL + DOI.
- [ ] Advisor reviews paper PR; merge after approval.
- [ ] Paper PDF rebuilt with DOI text; ready for Frontiers resubmission.
- [ ] Memory updated: `~/.claude/projects/.../memory/project_qr_paper_revision.md` reflects v1.0.0 + DOI.
