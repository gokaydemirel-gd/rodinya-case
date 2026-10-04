import { UserDto } from '../dto/user.dto';
import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AlsService } from '../../../common/als/als.service';
import {
  ApiErrors,
  ApiSuccessDto,
} from '../../../common/swagger/api-response.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@ApiErrors(401, 403, 404)
@Controller('users')
export class UserController {
  constructor(private readonly als: AlsService) {}

  @Get('me')
  @ApiSuccessDto(200, UserDto)
  me(): UserDto {
    if (!this.als.user) throw new UnauthorizedException();
    return this.als.user;
  }
}
