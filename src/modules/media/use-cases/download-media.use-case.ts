import type { MediaAccessService } from '../services/media-access.service';
import type { Readable } from 'node:stream';
import type { MediaRecord } from '../ports/media-repository.port';
import type { MediaStoragePort } from '../ports/media-storage.port';

export interface DownloadResult {
  stream: Readable;
  media: MediaRecord;
}

export class DownloadMediaUseCase {
  constructor(
    private readonly access: MediaAccessService,
    private readonly storage: MediaStoragePort,
  ) {}

  async execute(
    mediaId: string,
    currentUserId: string,
  ): Promise<DownloadResult> {
    const media = await this.access.requireReadable(mediaId, currentUserId);

    const stream = await this.storage.getStream(media.filePath);

    return {
      stream,
      media,
    };
  }
}
