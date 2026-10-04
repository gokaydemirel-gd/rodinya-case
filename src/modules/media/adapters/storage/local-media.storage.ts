import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, unlink, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { APP_CONFIG } from '../../../../common/config/config.tokens';
import type { AppConfig } from '../../../../common/config/app.config';
import { PhysicalFileNotFoundError } from '../../../../common/custom-errors';
import {
  MediaStoragePort,
  type StoredFileInput,
  type StoredFileResult,
} from '../../ports/media-storage.port';

@Injectable()
export class LocalMediaStorage extends MediaStoragePort {
  private readonly uploadDir: string;

  constructor(
    @Inject(APP_CONFIG)
    private readonly config: AppConfig,
  ) {
    super();
    this.uploadDir = resolve(process.cwd(), this.config.storage.uploadDir);
  }

  private async ensureUploadDir(): Promise<void> {
    if (!existsSync(this.uploadDir)) {
      await mkdir(this.uploadDir, { recursive: true, mode: 0o755 });
    }
  }

  async save(file: StoredFileInput): Promise<StoredFileResult> {
    await this.ensureUploadDir();

    const uniqueFileName = `${randomUUID()}.jpg`;
    const destinationPath = join(this.uploadDir, uniqueFileName);

    await writeFile(destinationPath, file.buffer);

    return {
      fileName: uniqueFileName,
      filePath: destinationPath,
      size: file.size,
    };
  }

  async getStream(filePath: string): Promise<Readable> {
    const isFileExisting = await this.exists(filePath);
    if (!isFileExisting) {
      throw new PhysicalFileNotFoundError('Fiziksel medya dosyası bulunamadı.');
    }
    return createReadStream(filePath);
  }

  async delete(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (!isMissingFile(error)) throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath);
      return true;
    } catch (error: unknown) {
      if (!isMissingFile(error)) throw error;
      return false;
    }
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
