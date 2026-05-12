import { Injectable } from '@nestjs/common';
import archiver from 'archiver';

interface ZipEntry {
  name: string;
  data: Buffer | string;
}

@Injectable()
export class ZipBuilderService {
  /**
   * Build a ZIP buffer from a flat list of {name, data} entries.
   *
   * Listeners on the archive must be attached BEFORE finalize() runs;
   * otherwise the synchronous part of finalize() can flush data + end
   * the stream before the listener registration takes effect.
   */
  build(entries: ZipEntry[]): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
      archive.on('warning', (err: Error & { code?: string }) => {
        if (err.code !== 'ENOENT') reject(err);
      });
      for (const entry of entries) {
        archive.append(entry.data, { name: entry.name });
      }
      archive.finalize().catch(reject);
    });
  }
}
