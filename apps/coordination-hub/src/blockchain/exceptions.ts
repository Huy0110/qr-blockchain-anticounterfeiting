import { HttpStatus } from '@nestjs/common';
import { Interface, type ErrorDescription } from 'ethers';
import { ProductRegistryABI } from '@qr-bc/shared';
import { DomainException } from '../common/exceptions/domain.exception';

/**
 * Maps the 8 ProductRegistry custom errors to typed DomainException
 * subclasses with stable codes. Used by ContractService to convert
 * revert data into HTTP-shaped errors that match the canonical envelope.
 */

export class OnChainProjectAlreadyExistsException extends DomainException {
  readonly code = 'ON_CHAIN_PROJECT_ALREADY_EXISTS';
  constructor(phi: string) {
    super(`On-chain registerProject reverted: project ${phi} exists`, HttpStatus.CONFLICT);
  }
}
export class OnChainProjectDoesNotExistException extends DomainException {
  readonly code = 'ON_CHAIN_PROJECT_DOES_NOT_EXIST';
  constructor(phi: string) {
    super(`On-chain call reverted: project ${phi} not registered`, HttpStatus.NOT_FOUND);
  }
}
export class OnChainUnauthorizedProducerException extends DomainException {
  readonly code = 'ON_CHAIN_UNAUTHORIZED_PRODUCER';
  constructor(phi: string, caller: string) {
    super(
      `On-chain registerBatch reverted: ${caller} is not the producer for ${phi}`,
      HttpStatus.FORBIDDEN,
    );
  }
}
export class OnChainBatchTooLargeException extends DomainException {
  readonly code = 'ON_CHAIN_BATCH_TOO_LARGE';
  constructor(size: number) {
    super(
      `On-chain registerBatch reverted: batch size ${size} exceeds 500`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
export class OnChainEmptyBatchException extends DomainException {
  readonly code = 'ON_CHAIN_EMPTY_BATCH';
  constructor() {
    super('On-chain registerBatch reverted: empty batch', HttpStatus.BAD_REQUEST);
  }
}
export class OnChainDuplicateProductHashException extends DomainException {
  readonly code = 'ON_CHAIN_DUPLICATE_PRODUCT_HASH';
  constructor(phi: string, h: string) {
    super(`On-chain registerBatch reverted: hash ${h} already in ${phi}`, HttpStatus.CONFLICT);
  }
}
export class OnChainProductDoesNotExistException extends DomainException {
  readonly code = 'ON_CHAIN_PRODUCT_DOES_NOT_EXIST';
  constructor(phi: string, h: string) {
    super(`On-chain redeemProduct reverted: ${h} not registered in ${phi}`, HttpStatus.NOT_FOUND);
  }
}
export class OnChainProductAlreadyRedeemedException extends DomainException {
  readonly code = 'ON_CHAIN_PRODUCT_ALREADY_REDEEMED';
  constructor(phi: string, h: string) {
    super(`On-chain redeemProduct reverted: ${h} already redeemed`, HttpStatus.CONFLICT);
  }
}

const iface = new Interface(ProductRegistryABI as never);

interface RevertCarrier {
  data?: string;
  error?: { data?: string };
  info?: { error?: { data?: string } };
}

/**
 * Decode an ethers revert into one of the typed exceptions. Returns
 * undefined if the revert isn't a known custom error (caller should
 * rethrow the original error).
 */
export function tryMapRevertToDomainError(err: unknown): DomainException | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const carrier = err as RevertCarrier;
  const data = carrier.data ?? carrier.error?.data ?? carrier.info?.error?.data ?? undefined;
  if (typeof data !== 'string') return undefined;

  let parsed: ErrorDescription | null = null;
  try {
    parsed = iface.parseError(data);
  } catch {
    return undefined;
  }
  if (!parsed) return undefined;

  switch (parsed.name) {
    case 'ProjectAlreadyExists':
      return new OnChainProjectAlreadyExistsException(String(parsed.args[0]));
    case 'ProjectDoesNotExist':
      return new OnChainProjectDoesNotExistException(String(parsed.args[0]));
    case 'UnauthorizedProducer':
      return new OnChainUnauthorizedProducerException(
        String(parsed.args[0]),
        String(parsed.args[1]),
      );
    case 'BatchTooLarge':
      return new OnChainBatchTooLargeException(Number(parsed.args[0]));
    case 'EmptyBatch':
      return new OnChainEmptyBatchException();
    case 'DuplicateProductHash':
      return new OnChainDuplicateProductHashException(
        String(parsed.args[0]),
        String(parsed.args[1]),
      );
    case 'ProductDoesNotExist':
      return new OnChainProductDoesNotExistException(
        String(parsed.args[0]),
        String(parsed.args[1]),
      );
    case 'ProductAlreadyRedeemed':
      return new OnChainProductAlreadyRedeemedException(
        String(parsed.args[0]),
        String(parsed.args[1]),
      );
    default:
      return undefined;
  }
}
