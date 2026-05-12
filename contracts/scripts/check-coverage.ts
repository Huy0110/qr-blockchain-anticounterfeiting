import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Coverage gate. Runs `forge coverage --report lcov` and fails (exit 1) if
 * line coverage on contracts/src/ drops below the threshold (default 90%,
 * matching AC-SC-15 / AC-SA-8).
 *
 * Run with:
 *   pnpm --filter @qr-bc/contracts exec ts-node scripts/check-coverage.ts
 *
 * --threshold <pct>   override threshold (default 90)
 * --no-run            skip running forge coverage; reuse existing lcov.info
 */

const args = process.argv.slice(2);
const thresholdIdx = args.indexOf('--threshold');
const threshold = thresholdIdx >= 0 ? Number(args[thresholdIdx + 1]) : 90;
const skipRun = args.includes('--no-run');
const lcovPath = join(__dirname, '..', 'lcov.info');

if (!skipRun) {
  console.log('Running forge coverage --report lcov ...');
  try {
    execSync('forge coverage --report lcov --report summary', {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });
  } catch {
    console.error('forge coverage failed');
    process.exit(2);
  }
}

if (!existsSync(lcovPath)) {
  console.error(`lcov.info not found at ${lcovPath}`);
  process.exit(2);
}

const lcov = readFileSync(lcovPath, 'utf8');

interface FileCoverage {
  file: string;
  linesFound: number;
  linesHit: number;
}

const records: FileCoverage[] = [];
let current: Partial<FileCoverage> = {};
for (const line of lcov.split(/\r?\n/)) {
  if (line.startsWith('SF:')) {
    current = { file: line.slice(3).trim() };
  } else if (line.startsWith('LF:')) {
    current.linesFound = Number(line.slice(3));
  } else if (line.startsWith('LH:')) {
    current.linesHit = Number(line.slice(3));
  } else if (line.startsWith('end_of_record') && current.file !== undefined) {
    records.push(current as FileCoverage);
    current = {};
  }
}

const srcRecords = records.filter(
  (r) =>
    (r.file.startsWith('src/') || r.file.includes('/src/')) &&
    !r.file.includes('/test/') &&
    !r.file.startsWith('test/'),
);
if (srcRecords.length === 0) {
  console.error('No src/ files found in lcov.info — did forge coverage skip them?');
  process.exit(2);
}

let totalFound = 0;
let totalHit = 0;
console.log('\nLine coverage on src/:');
for (const r of srcRecords) {
  const pct = r.linesFound === 0 ? 100 : (r.linesHit / r.linesFound) * 100;
  console.log(`  ${r.file}: ${r.linesHit}/${r.linesFound} (${pct.toFixed(2)}%)`);
  totalFound += r.linesFound;
  totalHit += r.linesHit;
}
const overallPct = totalFound === 0 ? 100 : (totalHit / totalFound) * 100;
console.log(`\nTotal src/: ${totalHit}/${totalFound} (${overallPct.toFixed(2)}%)`);
console.log(`Threshold:  ${threshold}%`);

if (overallPct < threshold) {
  console.error(`\n✗ Coverage ${overallPct.toFixed(2)}% < ${threshold}% threshold`);
  process.exit(1);
}
console.log(`\n✓ Coverage ${overallPct.toFixed(2)}% meets the ${threshold}% threshold`);
