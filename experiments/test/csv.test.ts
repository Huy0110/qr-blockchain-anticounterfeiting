import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeCsv } from '../lib/csv';

describe('writeCsv', () => {
  it('preserves the first row key order in the header (deterministic)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csv-'));
    const path = join(dir, 'out.csv');
    writeCsv(path, [
      { trial: 0, ms: 1.5, value: 'a' },
      { trial: 1, ms: 2.5, value: 'b' },
    ]);
    const text = readFileSync(path, 'utf8');
    expect(text).toBe('trial,ms,value\n0,1.5,a\n1,2.5,b\n');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csv-'));
    const path = join(dir, 'out.csv');
    writeCsv(path, [{ msg: 'a,b', q: 'has "quotes"', nl: 'a\nb' }]);
    const text = readFileSync(path, 'utf8');
    expect(text).toContain('"a,b"');
    expect(text).toContain('"has ""quotes"""');
    expect(text).toContain('"a\nb"');
  });

  it('emits an empty file for an empty rows array', () => {
    const dir = mkdtempSync(join(tmpdir(), 'csv-'));
    const path = join(dir, 'out.csv');
    writeCsv(path, []);
    expect(readFileSync(path, 'utf8')).toBe('');
  });
});
