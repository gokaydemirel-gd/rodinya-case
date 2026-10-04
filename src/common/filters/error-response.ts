import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorResponse } from '../../app.response';
import {
  DomainError,
  type DomainErrorKind,
} from '../custom-errors/domain.errors';

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  validation: HttpStatus.BAD_REQUEST,
  not_found: HttpStatus.NOT_FOUND,
  forbidden: HttpStatus.FORBIDDEN,
  unauthorized: HttpStatus.UNAUTHORIZED,
  conflict: HttpStatus.CONFLICT,
};

// Preserves a response already normalized by the interceptor.
export class ApiHttpException extends HttpException {
  constructor(
    public readonly body: ErrorResponse,
    public readonly originalError?: unknown,
  ) {
    super(body, body.statusCode, { cause: originalError });
  }
}

export function toErrorResponse(exception: unknown): ErrorResponse {
  if (exception instanceof ApiHttpException) return exception.body;

  if (exception instanceof DomainError) {
    return {
      success: false,
      statusCode: STATUS_BY_KIND[exception.kind],
      error: { code: exception.name, message: exception.message },
    };
  }

  if (exception instanceof HttpException && exception.getStatus() < 500) {
    const body = exception.getResponse();
    let message: string | string[] = exception.message;
    if (typeof body === 'string') {
      message = body;
    } else if ('message' in body) {
      const value: unknown = body.message;
      if (typeof value === 'string') message = value;
      else if (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'string')
      ) {
        message = value;
      }
    }
    return {
      success: false,
      statusCode: exception.getStatus(),
      error: { code: exception.name, message },
    };
  }

  return {
    success: false,
    statusCode:
      exception instanceof HttpException ? exception.getStatus() : 500,
    error: {
      code: 'InternalServerError',
      message: 'Beklenmeyen bir hata oluştu.',
    },
  };
}
