import { IsIn, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import type { PermissionAction } from '../ports/media-repository.port';

export class ManagePermissionDto {
  @ApiProperty({
    description: 'İzin verilecek veya izni kaldırılacak kullanıcı ID’si',
  })
  @IsMongoId()
  userId: string;

  @ApiProperty({ enum: ['add', 'remove'] })
  @IsIn(['add', 'remove'])
  action: PermissionAction;
}

export class MediaPermissionsDto {
  @ApiProperty()
  mediaId: string;

  @ApiProperty({ type: [String] })
  allowedUserIds: string[];
}
