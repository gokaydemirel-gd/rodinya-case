export interface AppConfig {
  port: number;
  mongoUri: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  storage: {
    uploadDir: string;
    maxFileSize: number;
  };
}

export function loadAppConfig(): AppConfig {
  const maxFileSize = Number(process.env.MAX_FILE_SIZE ?? '5242880');
  if (
    !Number.isInteger(maxFileSize) ||
    maxFileSize < 1 ||
    maxFileSize > 5242880
  ) {
    throw new Error('MAX_FILE_SIZE must be an integer between 1 and 5242880');
  }
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    mongoUri: process.env.MONGO_URI ?? '',
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    },
    storage: {
      uploadDir: process.env.UPLOAD_DIR ?? './uploads',
      maxFileSize,
    },
  };
}
