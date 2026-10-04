import { ApiProperty } from '@nestjs/swagger';

export class MediaDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;

  @ApiProperty({ type: 'integer', description: 'Dosya boyutu (bayt)' })
  size: number;

  @ApiProperty({ type: [String] })
  allowedUserIds: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}
