import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import * as path from 'path';
import type { ObjectStorage, StoredObject } from './object-storage.port';

@Injectable()
export class LocalObjectStorage implements ObjectStorage {
  readonly driver = 'local' as const;

  constructor(private readonly config: ConfigService) {}

  private root(): string {
    return this.config.getOrThrow<string>('STORAGE_LOCAL_ROOT');
  }

  private resolve(key: string): string {
    const safe = key.replace(/\\/g, '/').replace(/\.\./g, '');
    return path.join(this.root(), ...safe.split('/'));
  }

  async put(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredObject> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return { key, contentType, byteSize: body.byteLength };
  }

  async get(
    key: string,
  ): Promise<{ body: Buffer; contentType: string } | null> {
    const full = this.resolve(key);
    try {
      const body = await fs.readFile(full);
      const ext = path.extname(full).toLowerCase();
      const contentType =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.woff2'
                ? 'font/woff2'
                : ext === '.ttf'
                  ? 'font/ttf'
                  : ext === '.otf'
                    ? 'font/otf'
                    : ext === '.jpg' || ext === '.jpeg'
                      ? 'image/jpeg'
                      : 'application/octet-stream';
      return { body, contentType };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const full = this.resolve(key);
    try {
      await fs.unlink(full);
    } catch {
      // ignore missing
    }
  }

  publicUrlHint(key: string): string | null {
    return `local://${key}`;
  }

  /** Used by tests / streaming helpers. */
  openReadStream(key: string) {
    return createReadStream(this.resolve(key));
  }
}
