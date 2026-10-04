export type PermissionAction = 'add' | 'remove';

export interface MediaRecord {
  id: string;
  ownerId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  allowedUserIds: string[];
  createdAt: Date;
  deletingAt?: Date | null;
}

export interface CreateMediaRecordInput {
  ownerId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  allowedUserIds?: string[];
}

export interface MediaPageOptions {
  page: number;
  limit: number;
}
export interface MediaPage {
  items: MediaRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class MediaRepositoryPort {
  abstract create(input: CreateMediaRecordInput): Promise<MediaRecord>;
  abstract findById(id: string): Promise<MediaRecord | null>;
  abstract findByOwnerId(
    ownerId: string,
    options: MediaPageOptions,
  ): Promise<MediaPage>;
  abstract findByIdForDeletion(id: string): Promise<MediaRecord | null>;
  abstract markForDeletion(id: string, ownerId: string): Promise<boolean>;
  abstract deleteById(id: string): Promise<boolean>;
  abstract addPermission(id: string, userId: string): Promise<boolean>;
  abstract removePermission(id: string, userId: string): Promise<boolean>;
  abstract getPermissions(id: string): Promise<string[] | null>;
}
