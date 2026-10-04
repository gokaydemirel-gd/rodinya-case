import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { catchError, map, type Observable, throwError } from 'rxjs';
import type { SuccessResponse } from '../../app.response';
import { ApiHttpException, toErrorResponse } from '../filters/error-response';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    return next.handle().pipe(
      map((data): SuccessResponse<unknown> | StreamableFile => {
        if (data instanceof StreamableFile) return data;
        const { statusCode } = context
          .switchToHttp()
          .getResponse<{ statusCode: number }>();
        return { success: true, statusCode, data: data ?? null };
      }),
      catchError((error: unknown) =>
        throwError(() => new ApiHttpException(toErrorResponse(error), error)),
      ),
    );
  }
}
