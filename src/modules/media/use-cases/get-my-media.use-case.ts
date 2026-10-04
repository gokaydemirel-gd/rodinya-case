import type {
  MediaPage,
  MediaPageOptions,
  MediaRepositoryPort,
} from '../ports/media-repository.port';

export class GetMyMediaUseCase {
  constructor(private readonly repository: MediaRepositoryPort) {}

  async execute(
    userId: string,
    options: MediaPageOptions = { page: 1, limit: 20 },
  ): Promise<MediaPage> {
    return this.repository.findByOwnerId(userId, options);
  }
}
