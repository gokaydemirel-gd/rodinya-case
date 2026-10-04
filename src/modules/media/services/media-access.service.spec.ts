import { MediaAccessService } from './media-access.service';
import {
  MediaAccessDeniedError,
  MediaNotFoundError,
  MediaOwnerOnlyError,
} from '../../../common/custom-errors';
import type {
  MediaRecord,
  MediaRepositoryPort,
} from '../ports/media-repository.port';

function setup(deletingAt: Date | null = null) {
  const media: MediaRecord = {
    id: 'media',
    ownerId: 'owner',
    allowedUserIds: ['viewer'],
    fileName: 'image.jpg',
    filePath: '/uploads/image.jpg',
    mimeType: 'image/jpeg',
    size: 1,
    createdAt: new Date(),
    deletingAt,
  };
  const findById = jest
    .fn<Promise<MediaRecord | null>, [string]>()
    .mockResolvedValue(media);
  const findByIdForDeletion = jest
    .fn<Promise<MediaRecord | null>, [string]>()
    .mockResolvedValue(media);
  const repository = {
    findById,
    findByIdForDeletion,
  } as unknown as MediaRepositoryPort;
  return {
    service: new MediaAccessService(repository),
    media,
    findById,
    findByIdForDeletion,
  };
}

describe('MediaAccessService', () => {
  it.each(['owner', 'viewer'])(
    'allows %s to read active media',
    async (userId) => {
      const { service, media } = setup();
      await expect(service.requireReadable('media', userId)).resolves.toBe(
        media,
      );
    },
  );

  it('rejects a reader without permission', async () => {
    await expect(
      setup().service.requireReadable('media', 'outsider'),
    ).rejects.toBeInstanceOf(MediaAccessDeniedError);
  });

  it.each(['requireOwner', 'requireDeletable'] as const)(
    '%s only allows the owner',
    async (method) => {
      const { service, media } = setup();
      await expect(service[method]('media', 'owner')).resolves.toBe(media);
      await expect(service[method]('media', 'viewer')).rejects.toBeInstanceOf(
        MediaOwnerOnlyError,
      );
    },
  );

  it('only exposes pending deletion to its owner through requireDeletable', async () => {
    const { service, media, findByIdForDeletion } = setup(new Date());
    await expect(
      service.requireReadable('media', 'owner'),
    ).rejects.toBeInstanceOf(MediaNotFoundError);
    await expect(service.requireOwner('media', 'owner')).rejects.toBeInstanceOf(
      MediaNotFoundError,
    );
    await expect(service.requireDeletable('media', 'owner')).resolves.toBe(
      media,
    );
    await expect(
      service.requireDeletable('media', 'viewer'),
    ).rejects.toBeInstanceOf(MediaOwnerOnlyError);
    expect(findByIdForDeletion).toHaveBeenCalledWith('media');
  });

  it.each(['requireReadable', 'requireOwner', 'requireDeletable'] as const)(
    '%s rejects missing media',
    async (method) => {
      const { service, findById, findByIdForDeletion } = setup();
      findById.mockResolvedValue(null);
      findByIdForDeletion.mockResolvedValue(null);
      await expect(service[method]('missing', 'owner')).rejects.toBeInstanceOf(
        MediaNotFoundError,
      );
    },
  );
});
