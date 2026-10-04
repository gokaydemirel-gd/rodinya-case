import type { MediaRecord } from '../ports/media-repository.port';
import type { MediaAccessService } from '../services/media-access.service';

export class GetMediaByIdUseCase {
  constructor(private readonly access: MediaAccessService) {}

  execute(mediaId: string, currentUserId: string): Promise<MediaRecord> {
    return this.access.requireReadable(mediaId, currentUserId);
  }
}
