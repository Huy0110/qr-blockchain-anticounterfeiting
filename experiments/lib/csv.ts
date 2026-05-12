/**
 * Deterministic CSV emitter. Column order is fixed by the first row's
 * Object.keys() so reviewers re-running the same script see byte-identical
 * raw.csv files (modulo the float values themselves). We don't go through
 * `csv-stringify` here for the simple case — keeping deps light.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function writeCsv<T extends object>(path: string, rows: readonly T[]): void {
  mkdirSync(dirname(path), { recursive: true });
  if (rows.length === 0) {
    writeFileSync(path, '', 'utf8');
    return;
  }
  const first = rows[0];
  if (!first) {
    writeFileSync(path, '', 'utf8');
    return;
  }
  const cols = Object.keys(first);
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => csvCell((row as Record<string, unknown>)[c])).join(','));
  }
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? formatNumber(v) : String(v);
  // Quote if it contains comma / quote / newline.
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return '';
  if (Number.isInteger(v)) return String(v);
  // 6 significant figures keep the file small and avoid float jitter.
  return v.toFixed(6).replace(/\.?0+$/, '');
}
