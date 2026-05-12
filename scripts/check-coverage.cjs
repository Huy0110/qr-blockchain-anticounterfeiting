#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Parse forge's `lcov.info` and fail the CI step if line coverage is
 * below the threshold. Used by `.github/workflows/contracts-ci.yml`
 * to enforce AC-SA-9 (contracts ≥ 90% line coverage).
 *
 * Usage:
 *   node scripts/check-coverage.cjs <lcov.info> <minPct>
 */
const fs = require('node:fs');

const [, , lcovPath, minPctArg] = process.argv;
if (!lcovPath || !minPctArg) {
  console.error('Usage: check-coverage.cjs <lcov.info> <minPct>');
  process.exit(2);
}
const minPct = Number(minPctArg);
if (!Number.isFinite(minPct)) {
  console.error('minPct must be a number');
  process.exit(2);
}

if (!fs.existsSync(lcovPath)) {
  console.error(`lcov file not found: ${lcovPath}`);
  process.exit(2);
}

const text = fs.readFileSync(lcovPath, 'utf8');
let linesFound = 0;
let linesHit = 0;
for (const line of text.split('\n')) {
  if (line.startsWith('LF:')) linesFound += Number(line.slice(3));
  else if (line.startsWith('LH:')) linesHit += Number(line.slice(3));
}

if (linesFound === 0) {
  console.error('No lines reported in lcov — coverage tool misconfigured?');
  process.exit(2);
}

const pct = (linesHit / linesFound) * 100;
const status = pct >= minPct ? 'PASS' : 'FAIL';
console.log(
  `[${status}] line coverage: ${linesHit}/${linesFound} = ${pct.toFixed(2)}% (gate >= ${minPct}%)`,
);
if (pct < minPct) process.exit(1);
