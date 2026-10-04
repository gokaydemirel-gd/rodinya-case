import { UploadMediaUseCase } from './upload-media.use-case';
import type { MediaRepositoryPort } from '../ports/media-repository.port';
import type { MediaStoragePort } from '../ports/media-storage.port';

describe('UploadMediaUseCase', () => {
  it('removes the saved file when database persistence fails', async () => {
    const error = new Error('Database unavailable');
    const repository = {
      create: jest.fn().mockRejectedValue(error),
    } as unknown as MediaRepositoryPort;
    const deleteFile = jest.fn().mockResolvedValue(undefined);
    const storage = {
      save: jest.fn().mockResolvedValue({
        filePath: '/tmp/new.jpg',
        fileName: 'new.jpg',
        size: 3,
      }),
      delete: deleteFile,
    } as unknown as MediaStoragePort;
    await expect(
      new UploadMediaUseCase(repository, storage).execute('owner', {
        buffer: Buffer.from([255, 216, 255]),
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: 3,
      }),
    ).rejects.toBe(error);
    expect(deleteFile).toHaveBeenCalledWith('/tmp/new.jpg');
  });
});
