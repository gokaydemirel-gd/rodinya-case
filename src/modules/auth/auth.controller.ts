import { AuthResponseDto, TokenPairDto } from './dto/auth-response.dto';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import {
  ApiErrors,
  ApiSuccessDto,
} from '../../common/swagger/api-response.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';

@ApiTags('Auth')
@Public()
@ApiErrors(400, 401, 409)
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiSuccessDto(201, AuthResponseDto)
  register(@Body() body: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(body.email, body.password);
  }

  @Post('login')
  @HttpCode(200)
  @ApiSuccessDto(200, AuthResponseDto)
  login(@Body() body: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiSuccessDto(200, TokenPairDto)
  refresh(@Body() body: RefreshDto): Promise<TokenPairDto> {
    return this.auth.refresh(body.refreshToken);
  }
}
