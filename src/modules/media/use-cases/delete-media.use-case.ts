import type { MediaAccessService } from '../services/media-access.service';
import type { MediaRepositoryPort } from '../ports/media-repository.port';
import type { MediaStoragePort } from '../ports/media-storage.port';

export class DeleteMediaUseCase {
  constructor(
    private readonly repository: MediaRepositoryPort,
    private readonly storage: MediaStoragePort,
    private readonly access: MediaAccessService,
  ) {}

  async execute(mediaId: string, currentUserId: string): Promise<void> {
    const media = await this.access.requireDeletable(mediaId, currentUserId);

    // Persist the intent before touching the file. Retrying DELETE resumes here.
    if (
      !media.deletingAt &&
      !(await this.repository.markForDeletion(mediaId, currentUserId))
    )
      return;
    await this.storage.delete(media.filePath);
    await this.repository.deleteById(mediaId);
  }
}
