/**
 * check-abi-up-to-date.ts — CI gate. Re-runs build-abi against an in-memory
 * temp file and compares to the committed src/abi/ProductRegistry.json. If
 * the diff is non-empty, fails (exit 1) with a useful diff so the contributor
 * knows to commit the regenerated ABI.
 *
 *   pnpm --filter @qr-bc/shared check:abi
 */
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMITTED = resolve(__dirname, '..', 'src', 'abi', 'ProductRegistry.json');

if (!existsSync(COMMITTED)) {
  console.error(
    `No committed ABI at ${COMMITTED}. Run 'pnpm --filter @qr-bc/shared build:abi' and commit the result.`,
  );
  process.exit(1);
}

// Run build-abi to a temp output by setting an override env var, OR
// re-import the script logic. Easiest: re-run the script and capture output
// from the canonical location, then diff. For determinism we instead
// re-run build-abi and compare the on-disk file against a backup.

const backup = readFileSync(COMMITTED, 'utf8');

const buildScript = resolve(__dirname, 'build-abi.ts');
try {
  execFileSync('pnpm', ['exec', 'tsx', buildScript], {
    cwd: resolve(__dirname, '..'),
    stdio: 'pipe',
  });
} catch (err) {
  console.error('build-abi failed during check:', err);
  // Restore backup before exiting.
  writeFileSync(COMMITTED, backup);
  process.exit(1);
}

const fresh = readFileSync(COMMITTED, 'utf8');

if (backup === fresh) {
  console.log(`✓ ABI up-to-date: ${COMMITTED}`);
  process.exit(0);
}

// Restore the original file so the working tree isn't dirty after the check.
writeFileSync(COMMITTED, backup);

// Write the fresh version to a tmp dir for the contributor to inspect.
const tmp = mkdtempSync(join(tmpdir(), 'abi-check-'));
const freshPath = join(tmp, 'ProductRegistry.fresh.json');
writeFileSync(freshPath, fresh);

console.error(
  `✗ ABI drift detected.\n` +
    `  Committed: ${COMMITTED}\n` +
    `  Fresh:     ${freshPath}\n\n` +
    `Run 'pnpm --filter @qr-bc/shared build:abi' and commit the result.\n` +
    `Diff (committed → fresh):`,
);
try {
  execFileSync('diff', ['-u', COMMITTED, freshPath], { stdio: 'inherit' });
} catch {
  // diff exits 1 when files differ — that's exactly what we want here.
}
rmSync(tmp, { recursive: true, force: true });
process.exit(1);
