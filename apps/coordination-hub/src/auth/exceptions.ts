import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../common/exceptions/domain.exception';

/* eslint-disable @typescript-eslint/no-magic-numbers */

export class EmailExistsException extends DomainException {
  readonly code = 'EMAIL_EXISTS';
  constructor(email: string) {
    super(`A producer with email ${email} already exists`, HttpStatus.CONFLICT);
  }
}

export class InvalidCredentialsException extends DomainException {
  readonly code = 'INVALID_CREDENTIALS';
  constructor() {
    super('Email or password is incorrect', HttpStatus.UNAUTHORIZED);
  }
}

export class AccountLockedException extends DomainException {
  readonly code = 'ACCOUNT_LOCKED';
  constructor(unlockAt: Date) {
    // 423 Locked. Some @nestjs/common minor versions don't expose
    // HttpStatus.LOCKED, so use the numeric code directly.
    super('Account locked due to repeated failed logins', 423, {
      unlockAt: unlockAt.toISOString(),
    });
  }
}

export class InvalidRefreshTokenException extends DomainException {
  readonly code = 'INVALID_REFRESH_TOKEN';
  constructor() {
    super('Refresh token is invalid or expired', HttpStatus.UNAUTHORIZED);
  }
}
