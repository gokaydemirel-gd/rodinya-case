import { ApiProperty } from '@nestjs/swagger';
import type { UserRole } from '../../../common/auth/user-role';

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ format: 'email' })
  email: string;

  @ApiProperty({ enum: ['user', 'admin'] })
  role: UserRole;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
