import { AlsService } from '../als/als.service';
import { ApiHttpException, toErrorResponse } from './error-response';
import { Logger, type ArgumentsHost } from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import {
  AuthenticationError,
  InvalidIdentifierError,
  InvalidMediaFileError,
  MediaNotFoundError,
  MediaOwnerOnlyError,
  PhysicalFileNotFoundError,
  UserAccessDeniedError,
  UserAlreadyExistsError,
  UserNotFoundError,
} from '../custom-errors';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([
    [new InvalidIdentifierError(), 400],
    [new InvalidMediaFileError(), 400],
    [new MediaNotFoundError(), 404],
    [new PhysicalFileNotFoundError(), 404],
    [new MediaOwnerOnlyError(), 403],
    [new UserNotFoundError(), 404],
    [new UserAlreadyExistsError(), 409],
    [new UserAccessDeniedError(), 403],
    [new AuthenticationError(), 401],
  ] as const)('maps %s to HTTP %i', (error, expectedStatus) => {
    const response = {};
    const reply = jest.fn();
    const adapterHost = {
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost;
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ method: 'GET', url: '/media/123' }),
      }),
    } as unknown as ArgumentsHost;

    new ApiExceptionFilter(adapterHost, new AlsService()).catch(error, host);

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        success: false,
        statusCode: expectedStatus,
        error: { code: error.constructor.name, message: error.message },
      },
      expectedStatus,
    );
  });
  it('logs the original error with the ALS request ID without exposing it in the response', () => {
    const log = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const als = new AlsService();
    const reply = jest.fn();
    const adapter = { httpAdapter: { reply } } as unknown as HttpAdapterHost;
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({}),
        getRequest: () => ({
          method: 'DELETE',
          url: '/media/123?token=do-not-log',
        }),
      }),
    } as unknown as ArgumentsHost;
    const original = new Error('Disk unavailable');
    const exception = new ApiHttpException(toErrorResponse(original), original);
    als.run({ requestId: 'request-123' }, () =>
      new ApiExceptionFilter(adapter, als).catch(exception, host),
    );
    expect(log).toHaveBeenCalledWith({
      requestId: 'request-123',
      method: 'DELETE',
      path: '/media/123',
      statusCode: 500,
      error: {
        name: 'Error',
        message: original.message,
        stack: original.stack,
      },
    });
    expect(JSON.stringify(reply.mock.calls)).not.toContain(original.message);
  });
});
