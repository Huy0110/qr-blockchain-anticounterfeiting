/**
 * RUN_ID generation + parsing. Every experiment writes its outputs
 * under `results/<RUN_ID>/<experiment>/`. The default ID is a UTC
 * timestamp with a short random suffix so two reviewers can't collide.
 *
 * Reviewers re-running an existing run pass `--run-id <id>` so the
 * orchestrator (`exp:all`) can stitch the per-experiment outputs into
 * one SUMMARY.md.
 */

import { randomBytes } from 'node:crypto';

/** Format: 2026-04-01T1530Z-ab12. */
export function generateRunId(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const min = String(now.getUTCMinutes()).padStart(2, '0');
  const suffix = randomBytes(2).toString('hex');
  return `${yyyy}-${mm}-${dd}T${hh}${min}Z-${suffix}`;
}

/**
 * Read RUN_ID from `--run-id <value>` argv, then `RUN_ID` env, then
 * generate a fresh one. Argv wins so per-experiment scripts launched
 * by `exp:all` stay in the same RUN_ID directory.
 */
export function resolveRunId(argv: readonly string[] = process.argv): string {
  const i = argv.indexOf('--run-id');
  if (i >= 0 && argv[i + 1]) return argv[i + 1] as string;
  if (process.env.RUN_ID) return process.env.RUN_ID;
  return generateRunId();
}

/** Numeric flag with default. Used by `--trials N`. */
export function readNumberFlag(
  flag: string,
  fallback: number,
  argv: readonly string[] = process.argv,
): number {
  const i = argv.indexOf(flag);
  if (i < 0 || !argv[i + 1]) return fallback;
  const v = Number(argv[i + 1]);
  return Number.isFinite(v) ? v : fallback;
}

/** String flag with default. Used by `--network hardhat|amoy`. */
export function readStringFlag(
  flag: string,
  fallback: string,
  argv: readonly string[] = process.argv,
): string {
  const i = argv.indexOf(flag);
  if (i < 0 || !argv[i + 1]) return fallback;
  return argv[i + 1] as string;
}
