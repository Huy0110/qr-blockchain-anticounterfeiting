import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../common/exceptions/domain.exception';

export class ProjectNotFoundException extends DomainException {
  readonly code = 'PROJECT_NOT_FOUND';
  constructor(phi: string) {
    super(`Project ${phi} not found`, HttpStatus.NOT_FOUND);
  }
}

export class ProjectAccessForbiddenException extends DomainException {
  readonly code = 'PROJECT_ACCESS_FORBIDDEN';
  constructor() {
    super('You do not own this project', HttpStatus.FORBIDDEN);
  }
}

export class PhiCollisionException extends DomainException {
  readonly code = 'PHI_COLLISION';
  constructor() {
    super('Failed to generate a unique phi after retries', HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export class OnChainRegistrationFailedException extends DomainException {
  readonly code = 'ON_CHAIN_REGISTRATION_FAILED';
  constructor(reason: string) {
    super(
      `Project creation aborted: on-chain registerProject failed (${reason}). No off-chain record persisted; please retry.`,
      HttpStatus.BAD_GATEWAY,
      { reason },
    );
  }
}
