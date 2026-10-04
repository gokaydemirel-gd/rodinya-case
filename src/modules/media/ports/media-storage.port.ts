import type { Readable } from 'node:stream';

export interface StoredFileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StoredFileResult {
  fileName: string;
  filePath: string;
  size: number;
}

export abstract class MediaStoragePort {
  abstract save(file: StoredFileInput): Promise<StoredFileResult>;
  abstract getStream(filePath: string): Promise<Readable>;
  abstract delete(filePath: string): Promise<void>;
  abstract exists(filePath: string): Promise<boolean>;
}
