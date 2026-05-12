import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../common/exceptions/domain.exception';

export class CertificationNotFoundException extends DomainException {
  readonly code = 'CERTIFICATION_NOT_FOUND';
  constructor(id: string) {
    super(`Certification ${id} not found on this project`, HttpStatus.NOT_FOUND);
  }
}
