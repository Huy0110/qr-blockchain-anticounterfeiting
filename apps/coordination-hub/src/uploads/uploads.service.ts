import { HttpStatus, Injectable } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { DomainException } from '../common/exceptions/domain.exception';
import { IpfsAdapter, type PinResult } from './ipfs-adapter.interface';

// Pinned to file-type@^18.x: v19 went ESM-only, which works under
// vitest (esbuild handles the interop) but throws
// ERR_PACKAGE_PATH_NOT_EXPORTED at runtime in the CJS-compiled NestJS
// docker image. v18.7.0 still ships dual CJS+ESM exports.

const ACCEPTED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ACCEPTED_PDF_MIMES = new Set(['application/pdf']);
const MAX_BYTES = 10 * 1024 * 1024;

export class UnsupportedMediaTypeException extends DomainException {
  readonly code = 'UNSUPPORTED_MEDIA_TYPE';
  constructor(detected?: string) {
    super('Unsupported media type', HttpStatus.UNSUPPORTED_MEDIA_TYPE, {
      detected: detected ?? 'unknown',
    });
  }
}

export class PayloadTooLargeException extends DomainException {
  readonly code = 'PAYLOAD_TOO_LARGE';
  constructor(size: number) {
    super('File exceeds 10 MB limit', HttpStatus.PAYLOAD_TOO_LARGE, { size });
  }
}

@Injectable()
export class UploadsService {
  constructor(private readonly adapter: IpfsAdapter) {}

  async pinImage(file: Buffer, filename: string): Promise<PinResult> {
    return this.pinFile(file, filename, ACCEPTED_IMAGE_MIMES);
  }

  async pinPdf(file: Buffer, filename: string): Promise<PinResult> {
    return this.pinFile(file, filename, ACCEPTED_PDF_MIMES);
  }

  pinJson(payload: unknown, name: string): Promise<PinResult> {
    return this.adapter.pinJson(payload, name);
  }

  private async pinFile(file: Buffer, filename: string, accepted: Set<string>): Promise<PinResult> {
    if (file.length > MAX_BYTES) throw new PayloadTooLargeException(file.length);
    // Use magic-byte sniffing rather than trusting client-provided
    // Content-Type — the latter is trivially spoofable.
    const detected = await fileTypeFromBuffer(file);
    if (!detected || !accepted.has(detected.mime)) {
      throw new UnsupportedMediaTypeException(detected?.mime);
    }
    return this.adapter.pinBytes(file, filename, detected.mime);
  }
}
