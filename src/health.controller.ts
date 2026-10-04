import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConnectionStates, type Connection } from 'mongoose';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/auth/public.decorator';
import { DATABASE_CONNECTION } from './common/database/database.tokens';
import { ApiErrors, ApiSuccess } from './common/swagger/api-response.decorator';

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly connection: Connection,
  ) {}

  @Get()
  @ApiSuccess(200, {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      database: { type: 'string', example: 'up' },
    },
  })
  @ApiErrors(503)
  async check() {
    try {
      if (
        this.connection.readyState !== ConnectionStates.connected ||
        !this.connection.db
      )
        throw new Error('Database disconnected');
      await this.connection.db.admin().ping({ timeoutMS: 2000 });
      return { status: 'ok', database: 'up' };
    } catch {
      throw new ServiceUnavailableException('Veritabanına erişilemiyor.');
    }
  }
}
