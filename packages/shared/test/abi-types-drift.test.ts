import { describe, it, expect } from 'vitest';
import { ProductRegistryABI } from '../src/index.js';

/**
 * Drift test for src/abi/types.ts vs src/abi/ProductRegistry.json.
 *
 * The hand-maintained `ProductRegistryContract` interface in
 * src/abi/types.ts duplicates the structure of the auto-generated
 * ProductRegistry.json. If a future contract change adds, removes, or
 * renames a function/event/error and a contributor regenerates the JSON
 * (via `pnpm --filter @qr-bc/shared build:abi`) but forgets to update
 * types.ts, consumers compiling against this package would silently use a
 * stale typed surface.
 *
 * This test enumerates the ABI's external surface at runtime and asserts
 * it matches the canonical lists below. Any drift forces a contributor to
 * update BOTH the JSON (regenerated from forge build output) AND the
 * EXPECTED_* lists here, which prompts them to update types.ts in the same
 * commit.
 *
 * If a contract surface change is intentional, the fix is:
 *   1. Re-run `pnpm --filter @qr-bc/shared build:abi`
 *   2. Update src/abi/types.ts with the new method/event/error
 *   3. Update the EXPECTED_* lists in this file
 *
 * Mirrors AC-SP-5 spirit (ABI parity) at the surface-name level.
 */

interface AbiEntry {
  type: string;
  name?: string;
}

const abi = ProductRegistryABI as ReadonlyArray<AbiEntry>;

const namesOfType = (type: string): string[] =>
  abi
    .filter((e) => e.type === type && typeof e.name === 'string')
    .map((e) => e.name as string)
    .sort();

const EXPECTED_FUNCTIONS = [
  'MAX_BATCH_SIZE',
  'projectExists',
  'redeemProduct',
  'registerBatch',
  'registerProject',
  'totalRedeemed',
  'verifyProduct',
].sort();

const EXPECTED_EVENTS = ['ProductRedeemed', 'ProductsRegistered', 'ProjectCreated'].sort();

const EXPECTED_ERRORS = [
  'BatchTooLarge',
  'DuplicateProductHash',
  'EmptyBatch',
  'ProductAlreadyRedeemed',
  'ProductDoesNotExist',
  'ProjectAlreadyExists',
  'ProjectDoesNotExist',
  'UnauthorizedProducer',
].sort();

describe('ABI ↔ ProductRegistryContract drift', () => {
  it('ABI contains exactly the expected function names', () => {
    expect(namesOfType('function')).toEqual(EXPECTED_FUNCTIONS);
  });

  it('ABI contains exactly the expected event names', () => {
    expect(namesOfType('event')).toEqual(EXPECTED_EVENTS);
  });

  it('ABI contains exactly the expected custom-error names', () => {
    expect(namesOfType('error')).toEqual(EXPECTED_ERRORS);
  });

  it('every external function has a stateMutability', () => {
    const fns = abi.filter((e) => e.type === 'function');
    for (const fn of fns) {
      expect(fn).toHaveProperty('stateMutability');
    }
  });
});
