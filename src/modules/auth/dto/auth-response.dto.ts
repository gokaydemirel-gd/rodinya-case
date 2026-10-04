import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../user/dto/user.dto';

export class TokenPairDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty({ enum: ['Bearer'] })
  tokenType: 'Bearer';

  @ApiProperty({
    type: 'integer',
    example: 604800,
    description: 'Access token geçerlilik süresi (saniye)',
  })
  expiresIn: number;
}

export class AuthResponseDto extends TokenPairDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;
}
