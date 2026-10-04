import {
  type ArgumentsHost,
  type ExceptionFilter,
  Catch,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AlsService } from '../als/als.service';
import { ApiHttpException, toErrorResponse } from './error-response';

// Guards and routing can fail before the response interceptor runs.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly als: AlsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<unknown>();
    const body = toErrorResponse(exception);
    const request = host
      .switchToHttp()
      .getRequest<{ method?: string; url?: string }>();
    const original =
      exception instanceof ApiHttpException
        ? (exception.originalError ?? exception)
        : exception;
    const entry = {
      requestId: this.als.requestId,
      method: request.method,
      path: request.url?.split('?')[0],
      statusCode: body.statusCode,
      error:
        original instanceof Error
          ? {
              name: original.name,
              message: original.message,
              stack: original.stack,
            }
          : { message: String(original) },
    };
    if (body.statusCode >= 500) this.logger.error(entry);
    else this.logger.warn(entry);
    this.adapterHost.httpAdapter.reply(response, body, body.statusCode);
  }
}
