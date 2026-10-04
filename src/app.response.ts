export interface SuccessResponse<T> {
  success: true;
  statusCode: number;
  data: T;
}

export interface ErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string | string[];
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
