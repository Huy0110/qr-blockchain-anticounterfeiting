import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../common/exceptions/domain.exception';

export class ActivityNotFoundException extends DomainException {
  readonly code = 'ACTIVITY_NOT_FOUND';
  constructor(id: string) {
    super(`Activity ${id} not found on this project`, HttpStatus.NOT_FOUND);
  }
}
