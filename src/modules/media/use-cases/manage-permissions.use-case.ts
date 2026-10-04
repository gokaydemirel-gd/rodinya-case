import type { MediaAccessService } from '../services/media-access.service';
import { UserRepositoryPort } from '../../user/ports/user-repository.port';
import { UserNotFoundError } from '../../../common/custom-errors';
import {
  MediaNotFoundError,
  SelfPermissionModificationError,
} from '../../../common/custom-errors';
import type {
  MediaRepositoryPort,
  PermissionAction,
} from '../ports/media-repository.port';

export class ManagePermissionsUseCase {
  constructor(
    private readonly repository: MediaRepositoryPort,
    private readonly users: UserRepositoryPort,
    private readonly access: MediaAccessService,
  ) {}

  async getPermissions(
    mediaId: string,
    currentUserId: string,
  ): Promise<string[]> {
    const media = await this.access.requireOwner(mediaId, currentUserId);

    return media.allowedUserIds;
  }

  async updatePermission(
    mediaId: string,
    currentUserId: string,
    targetUserId: string,
    action: PermissionAction,
  ): Promise<string[]> {
    if (targetUserId === currentUserId) {
      throw new SelfPermissionModificationError(
        'Medya sahibi kendi izinlerini değiştiremez.',
      );
    }

    await this.access.requireOwner(mediaId, currentUserId);

    if (action === 'add') {
      if (!(await this.users.findById(targetUserId)))
        throw new UserNotFoundError();
      await this.repository.addPermission(mediaId, targetUserId);
    } else {
      await this.repository.removePermission(mediaId, targetUserId);
    }

    const updatedPermissions = await this.repository.getPermissions(mediaId);
    if (updatedPermissions === null) throw new MediaNotFoundError();
    return updatedPermissions;
  }
}
