import {
  MediaAccessDeniedError,
  MediaNotFoundError,
  MediaOwnerOnlyError,
} from '../../../common/custom-errors';
import type {
  MediaRecord,
  MediaRepositoryPort,
} from '../ports/media-repository.port';

export class MediaAccessService {
  constructor(private readonly repository: MediaRepositoryPort) {}

  async requireReadable(mediaId: string, userId: string): Promise<MediaRecord> {
    const media = await this.requireActive(mediaId);
    if (media.ownerId !== userId && !media.allowedUserIds.includes(userId)) {
      throw new MediaAccessDeniedError();
    }
    return media;
  }

  async requireOwner(mediaId: string, userId: string): Promise<MediaRecord> {
    const media = await this.requireActive(mediaId);
    this.assertOwner(media, userId);
    return media;
  }

  // A pending deletion can only be accessed to resume deletion by its owner.
  async requireDeletable(
    mediaId: string,
    userId: string,
  ): Promise<MediaRecord> {
    const media = await this.repository.findByIdForDeletion(mediaId);
    if (!media) throw new MediaNotFoundError();
    this.assertOwner(media, userId);
    return media;
  }

  private async requireActive(mediaId: string): Promise<MediaRecord> {
    const media = await this.repository.findById(mediaId);
    if (!media || media.deletingAt) throw new MediaNotFoundError();
    return media;
  }

  private assertOwner(media: MediaRecord, userId: string): void {
    if (media.ownerId !== userId) throw new MediaOwnerOnlyError();
  }
}
