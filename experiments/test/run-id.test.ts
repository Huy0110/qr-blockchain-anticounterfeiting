import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateRunId, readNumberFlag, readStringFlag, resolveRunId } from '../lib/run-id';

describe('run-id', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.RUN_ID;
  });

  it('generateRunId emits a YYYY-MM-DDTHHMMZ-XXXX shape', () => {
    expect(generateRunId()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{4}Z-[0-9a-f]{4}$/);
  });

  it('resolveRunId prefers --run-id argv', () => {
    expect(resolveRunId(['node', 'x', '--run-id', 'pinned-id'])).toBe('pinned-id');
  });

  it('resolveRunId falls back to RUN_ID env when no flag given', () => {
    process.env.RUN_ID = 'env-id';
    expect(resolveRunId(['node', 'x'])).toBe('env-id');
  });

  it('resolveRunId generates a fresh id when neither flag nor env present', () => {
    delete process.env.RUN_ID;
    const id = resolveRunId(['node', 'x']);
    expect(id).toMatch(/^\d{4}-\d{2}-\d{2}T\d{4}Z-[0-9a-f]{4}$/);
  });

  it('readNumberFlag parses --trials values and falls back', () => {
    expect(readNumberFlag('--trials', 30, ['x', '--trials', '5'])).toBe(5);
    expect(readNumberFlag('--trials', 30, ['x'])).toBe(30);
    expect(readNumberFlag('--trials', 30, ['x', '--trials', 'NaN'])).toBe(30);
  });

  it('readStringFlag parses --network values and falls back', () => {
    expect(readStringFlag('--network', 'hardhat', ['x', '--network', 'amoy'])).toBe('amoy');
    expect(readStringFlag('--network', 'hardhat', ['x'])).toBe('hardhat');
  });
});
