import {
  BadRequestException,
  type ExecutionContext,
  StreamableFile,
} from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { UserAlreadyExistsError } from '../custom-errors';
import { toErrorResponse } from '../filters/error-response';
import { ResponseInterceptor } from './response.interceptor';

const createContext = (statusCode: number): ExecutionContext =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => ({ statusCode }) }),
  }) as ExecutionContext;
const context = createContext(200);

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  it.each([200, 201, 202])(
    'includes HTTP status %i with controller data',
    async (statusCode) => {
      const result = interceptor.intercept(createContext(statusCode), {
        handle: () => of({ id: '1' }),
      });
      await expect(firstValueFrom(result)).resolves.toEqual({
        success: true,
        statusCode,
        data: { id: '1' },
      });
    },
  );

  it('normalizes an empty result to null', async () => {
    const result = interceptor.intercept(context, {
      handle: () => of(undefined),
    });
    await expect(firstValueFrom(result)).resolves.toEqual({
      success: true,
      statusCode: 200,
      data: null,
    });
  });

  it('preserves file downloads', async () => {
    const file = new StreamableFile(Buffer.from('file'));
    const result = interceptor.intercept(context, { handle: () => of(file) });
    await expect(firstValueFrom(result)).resolves.toBe(file);
  });

  it.each([
    [new UserAlreadyExistsError(), 409, 'Kullanıcı zaten mevcut.'],
    [new BadRequestException(['Invalid email']), 400, ['Invalid email']],
    [
      new Error('secret database credentials'),
      500,
      'Beklenmeyen bir hata oluştu.',
    ],
  ])(
    'standardizes %s and preserves HTTP status',
    async (error, statusCode, message) => {
      const result = interceptor.intercept(context, {
        handle: () => throwError(() => error),
      });
      const caught: unknown = await firstValueFrom(result).catch(
        (failure: unknown) => failure,
      );
      expect(toErrorResponse(caught)).toMatchObject({
        success: false,
        statusCode,
        error: { message },
      });
    },
  );
});
