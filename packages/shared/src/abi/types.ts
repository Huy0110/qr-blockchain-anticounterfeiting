/**
 * Hand-written typed contract surface for ProductRegistry. Mirrors the ABI
 * declared in ./ProductRegistry.json with strict TypeScript types so
 * consumers get function/event signatures without pulling in TypeChain's
 * heavyweight code generator.
 *
 * If the contract surface changes, regenerate ./ProductRegistry.json via
 * `pnpm --filter @qr-bc/shared build:abi` and update this file in lockstep.
 */
import type { BaseContract, ContractEventName, EventLog, Listener } from 'ethers';
import type { Phi, Sid, Hash, Address } from '../types.js';

/** Decoded payload for the on-chain ProductRedeemed event. */
export interface ProductRedeemedEventArgs {
  phi: Phi;
  h: Hash;
  producer: Address;
  timestamp: bigint;
}

/** Decoded payload for ProjectCreated. */
export interface ProjectCreatedEventArgs {
  phi: Phi;
  producer: Address;
}

/** Decoded payload for ProductsRegistered. */
export interface ProductsRegisteredEventArgs {
  phi: Phi;
  count: bigint;
}

/** Tuple returned by `verifyProduct(phi, h)`. */
export type VerifyProductResult = readonly [exists: boolean, redeemed: boolean, producer: Address];

/**
 * Typed handle to a deployed ProductRegistry. Wrap a generic ethers
 * `BaseContract` with this interface to get strict argument and return
 * types at the call site.
 */
export interface ProductRegistryContract extends BaseContract {
  registerProject(phi: Phi): Promise<unknown>;
  registerBatch(phi: Phi, hashes: ReadonlyArray<Hash>): Promise<unknown>;
  redeemProduct(phi: Phi, sid: Sid | Uint8Array): Promise<unknown>;
  verifyProduct(phi: Phi, h: Hash): Promise<VerifyProductResult>;
  projectExists(phi: Phi): Promise<boolean>;
  totalRedeemed(): Promise<bigint>;

  on(event: ContractEventName, listener: Listener): Promise<this>;
  queryFilter(
    event: ContractEventName,
    fromBlock?: bigint | number,
    toBlock?: bigint | number,
  ): Promise<EventLog[]>;
}
