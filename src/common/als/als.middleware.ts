import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { AlsService } from './als.service';

@Injectable()
export class AlsMiddleware implements NestMiddleware {
  constructor(@Inject(AlsService) private readonly als: AlsService) {}

  use(
    _request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ): void {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    this.als.run({ requestId }, next);
  }
}
