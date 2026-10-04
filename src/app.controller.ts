import { Public } from './common/auth/public.decorator';
import { ApiSuccess } from './common/swagger/api-response.decorator';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiSuccess(200, { type: 'string', example: 'Hello World!' })
  getHello(): string {
    return this.appService.getHello();
  }
}
