import {
  InvalidMediaFileError,
  InvalidMediaMimeTypeError,
  MediaFileSizeExceededError,
} from '../../../common/custom-errors';
import type {
  MediaRecord,
  MediaRepositoryPort,
} from '../ports/media-repository.port';
import type {
  MediaStoragePort,
  StoredFileInput,
} from '../ports/media-storage.port';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB as specified in case study
const JPEG_MIME_TYPES = new Set(['image/jpeg', 'image/jpg']);

export class UploadMediaUseCase {
  constructor(
    private readonly repository: MediaRepositoryPort,
    private readonly storage: MediaStoragePort,
    private readonly maxFileSize: number = MAX_FILE_SIZE,
  ) {}

  private validate(file?: StoredFileInput): asserts file is StoredFileInput {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new InvalidMediaFileError(
        'Lütfen yüklenecek geçerli bir dosya seçin.',
      );
    }

    if (!JPEG_MIME_TYPES.has(file.mimeType.toLowerCase())) {
      throw new InvalidMediaMimeTypeError(
        'Sadece JPEG formatında görseller kabul edilir.',
      );
    }

    if (file.size > this.maxFileSize || file.buffer.length > this.maxFileSize) {
      throw new MediaFileSizeExceededError(
        `Dosya boyutu en fazla ${this.maxFileSize} bayt olabilir.`,
      );
    }
  }

  async execute(userId: string, file?: StoredFileInput): Promise<MediaRecord> {
    this.validate(file);

    const savedFile = await this.storage.save(file);

    try {
      return await this.repository.create({
        ownerId: userId,
        fileName: file.originalName,
        filePath: savedFile.filePath,
        mimeType: 'image/jpeg',
        size: savedFile.size,
        allowedUserIds: [],
      });
    } catch (error) {
      await this.storage.delete(savedFile.filePath);
      throw error;
    }
  }
}
