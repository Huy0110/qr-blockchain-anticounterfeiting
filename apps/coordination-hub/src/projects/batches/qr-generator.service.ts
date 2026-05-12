import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrGeneratorService {
  /** Render a UTF-8 string into a PNG buffer at high error correction. */
  toPng(text: string, opts: { size?: number } = {}): Promise<Buffer> {
    return QRCode.toBuffer(text, {
      type: 'png',
      errorCorrectionLevel: 'H',
      width: opts.size ?? 512,
      margin: 2,
    });
  }
}
