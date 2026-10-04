import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class MediaIdParamsDto {
  @ApiProperty({
    description: 'Medya kimliği (MongoDB ObjectId)',
    type: String,
    pattern: '^[a-fA-F0-9]{24}$',
    example: '507f1f77bcf86cd799439011',
  })
  @IsMongoId({ message: 'Geçersiz medya kimliği.' })
  id: string;
}
