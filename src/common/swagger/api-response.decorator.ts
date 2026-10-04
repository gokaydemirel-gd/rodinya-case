import { applyDecorators, type Type } from '@nestjs/common';
import {
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
  type SchemaObject,
} from '@nestjs/swagger';

export const ApiSuccess = (status: number, data: SchemaObject) =>
  ApiResponse({
    status,
    schema: {
      type: 'object',
      required: ['success', 'statusCode', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true] },
        statusCode: { type: 'integer', example: status },
        data,
      },
    },
  });

export const ApiSuccessDto = (
  status: number,
  model: Type<unknown>,
  isArray = false,
) =>
  applyDecorators(
    ApiExtraModels(model),
    ApiSuccess(
      status,
      isArray
        ? { type: 'array', items: { $ref: getSchemaPath(model) } }
        : { allOf: [{ $ref: getSchemaPath(model) }] },
    ),
  );

export const ApiErrors = (...statuses: number[]) =>
  applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        schema: {
          type: 'object',
          required: ['success', 'statusCode', 'error'],
          properties: {
            success: { type: 'boolean', enum: [false] },
            statusCode: { type: 'integer', example: status },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'string' } },
                  ],
                },
              },
            },
          },
        },
      }),
    ),
  );
