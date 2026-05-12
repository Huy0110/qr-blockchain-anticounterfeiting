import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Phi, Hash, Address } from '@qr-bc/shared';

/**
 * Abstract interface for the on-chain ProductRegistry. The real
 * ethers.js-backed implementation lands in T-019; this file defines the
 * service surface and a token so T-016 (projects) can depend on the
 * interface and tests can override it.
 *
 * The default OnModuleInit body is a no-op; T-019's implementation will
 * load the deployed address + connect to the RPC endpoint there.
 */
export interface VerifyProductResult {
  exists: boolean;
  redeemed: boolean;
  producer: Address;
}

export interface RedeemResult {
  txHash: string;
  blockNumber: number;
  timestamp: number;
}

export interface EncryptedKeyBundle {
  ciphertext: string;
  iv: string;
  authTag: string;
}

@Injectable()
export abstract class ContractService implements OnModuleInit {
  abstract onModuleInit(): void | Promise<void>;
  abstract registerProject(phi: Phi, ownerKey: EncryptedKeyBundle): Promise<string>;
  abstract registerBatch(phi: Phi, hashes: Hash[], ownerKey: EncryptedKeyBundle): Promise<string>;
  abstract redeemProduct(phi: Phi, sid: Uint8Array): Promise<RedeemResult>;
  abstract verifyProduct(phi: Phi, h: Hash): Promise<VerifyProductResult>;
  abstract projectExists(phi: Phi): Promise<boolean>;
  abstract totalRedeemed(): Promise<bigint>;
}

/** Stub implementation used until T-019. Throws on every call. */
@Injectable()
export class StubContractService extends ContractService {
  onModuleInit(): void {
    /* no-op */
  }
  registerProject(): Promise<string> {
    throw new Error('ContractService not yet implemented — wired in T-019');
  }
  registerBatch(): Promise<string> {
    throw new Error('ContractService not yet implemented — wired in T-019');
  }
  redeemProduct(): Promise<RedeemResult> {
    throw new Error('ContractService not yet implemented — wired in T-019');
  }
  verifyProduct(): Promise<VerifyProductResult> {
    throw new Error('ContractService not yet implemented — wired in T-019');
  }
  projectExists(): Promise<boolean> {
    throw new Error('ContractService not yet implemented — wired in T-019');
  }
  totalRedeemed(): Promise<bigint> {
    throw new Error('ContractService not yet implemented — wired in T-019');
  }
}
