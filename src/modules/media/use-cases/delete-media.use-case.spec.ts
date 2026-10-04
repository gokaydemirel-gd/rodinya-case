import { MediaAccessService } from '../services/media-access.service';
import { DeleteMediaUseCase } from './delete-media.use-case';
import { MediaOwnerOnlyError } from '../../../common/custom-errors';
import type {
  MediaRecord,
  MediaRepositoryPort,
} from '../ports/media-repository.port';
import type { MediaStoragePort } from '../ports/media-storage.port';

function setup() {
  let record: MediaRecord | null = {
    id: 'media',
    ownerId: 'owner',
    fileName: 'photo.jpg',
    filePath: '/uploads/photo.jpg',
    mimeType: 'image/jpeg',
    size: 1,
    allowedUserIds: [],
    createdAt: new Date(),
    deletingAt: null,
  };
  let fileExists = true;
  const mark = jest.fn(() => {
    if (record) record.deletingAt = new Date();
    return Promise.resolve(true);
  });
  const removeRecord = jest.fn(() => {
    record = null;
    return Promise.resolve(true);
  });
  const removeFile = jest.fn(() => {
    fileExists = false;
    return Promise.resolve();
  });
  const repository = {
    findByIdForDeletion: jest.fn(() => Promise.resolve(record)),
    markForDeletion: mark,
    deleteById: removeRecord,
  } as unknown as MediaRepositoryPort;
  const storage = { delete: removeFile } as unknown as MediaStoragePort;
  return {
    useCase: new DeleteMediaUseCase(
      repository,
      storage,
      new MediaAccessService(repository),
    ),
    mark,
    removeRecord,
    removeFile,
    getRecord: () => record,
    fileExists: () => fileExists,
  };
}

describe('Retryable media deletion', () => {
  it('persists the deletion intent and resumes after file deletion fails', async () => {
    const fixture = setup();
    fixture.removeFile.mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(fixture.useCase.execute('media', 'owner')).rejects.toThrow(
      'Disk unavailable',
    );
    expect(fixture.getRecord()?.deletingAt).toBeInstanceOf(Date);
    expect(fixture.removeRecord).not.toHaveBeenCalled();
    expect(fixture.fileExists()).toBe(true);
    await fixture.useCase.execute('media', 'owner');
    expect(fixture.getRecord()).toBeNull();
    expect(fixture.fileExists()).toBe(false);
    expect(fixture.mark).toHaveBeenCalledTimes(1);
  });

  it('resumes when the file was removed but the database delete failed', async () => {
    const fixture = setup();
    fixture.removeRecord.mockRejectedValueOnce(
      new Error('Database unavailable'),
    );
    await expect(fixture.useCase.execute('media', 'owner')).rejects.toThrow(
      'Database unavailable',
    );
    expect(fixture.fileExists()).toBe(false);
    expect(fixture.getRecord()?.deletingAt).toBeInstanceOf(Date);
    await fixture.useCase.execute('media', 'owner');
    expect(fixture.getRecord()).toBeNull();
  });

  it('does not touch the file if persisting deletion intent fails', async () => {
    const fixture = setup();
    fixture.mark.mockRejectedValueOnce(new Error('Database unavailable'));
    await expect(fixture.useCase.execute('media', 'owner')).rejects.toThrow();
    expect(fixture.removeFile).not.toHaveBeenCalled();
  });

  it('does not let another user delete pending media', async () => {
    const fixture = setup();
    fixture.removeFile.mockRejectedValueOnce(new Error('Disk unavailable'));
    await expect(fixture.useCase.execute('media', 'owner')).rejects.toThrow();
    await expect(
      fixture.useCase.execute('media', 'other'),
    ).rejects.toBeInstanceOf(MediaOwnerOnlyError);
    expect(fixture.removeFile).toHaveBeenCalledTimes(1);
  });
});
