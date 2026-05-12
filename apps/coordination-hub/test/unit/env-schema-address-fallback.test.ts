import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnv } from '../../src/config/env.schema';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  MONGO_URI: 'mongodb://localhost:27017/qr_bc_test',
  RPC_URL: 'http://127.0.0.1:8545',
};

describe('loadEnv — CONTRACT_ADDRESS fallback (AC-DO-7)', () => {
  let dir: string;
  let path: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'env-test-'));
    path = join(dir, 'address.txt');
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads <contractAddressFile> when CONTRACT_ADDRESS is unset', () => {
    const ADDR = `0x${'a'.repeat(40)}`;
    writeFileSync(path, `${ADDR}\n`, 'utf8');
    const env = loadEnv({ ...baseEnv }, { contractAddressFile: path });
    expect(env.CONTRACT_ADDRESS).toBe(ADDR);
  });

  it('does not override an explicitly-set CONTRACT_ADDRESS', () => {
    const ADDR_FROM_ENV = `0x${'b'.repeat(40)}`;
    writeFileSync(path, `0x${'a'.repeat(40)}\n`, 'utf8');
    const env = loadEnv(
      { ...baseEnv, CONTRACT_ADDRESS: ADDR_FROM_ENV },
      { contractAddressFile: path },
    );
    expect(env.CONTRACT_ADDRESS).toBe(ADDR_FROM_ENV);
  });

  it('leaves CONTRACT_ADDRESS undefined when neither env nor file is present', () => {
    // `path` doesn't exist (no writeFileSync above)
    const env = loadEnv({ ...baseEnv }, { contractAddressFile: path });
    expect(env.CONTRACT_ADDRESS).toBeUndefined();
  });

  it('ignores an empty file (avoids the schema rejecting empty string)', () => {
    writeFileSync(path, '   \n', 'utf8');
    const env = loadEnv({ ...baseEnv }, { contractAddressFile: path });
    expect(env.CONTRACT_ADDRESS).toBeUndefined();
  });
});
