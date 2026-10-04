import {
  Global,
  Inject,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import mongoose, { type Connection } from 'mongoose';
import { DATABASE_CONNECTION } from './database.tokens';
import { ConfigModule } from '../config/config.module';
import { APP_CONFIG } from '../config/config.tokens';
import type { AppConfig } from '../config/app.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [APP_CONFIG],
      useFactory: async (config: AppConfig): Promise<Connection> => {
        const uri = config.mongoUri;
        if (!uri) {
          throw new Error('MONGO_URI is required in environment variables');
        }
        const logger = new Logger('Database');
        const connection = mongoose.createConnection(uri);

        connection.on('connected', () => {
          logger.log('Connected to MongoDB successfully');
        });
        connection.on('error', (error) => {
          logger.error('MongoDB connection error', error);
        });
        connection.on('disconnected', () => {
          logger.warn('MongoDB connection disconnected');
        });

        return connection.asPromise();
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly connection: Connection,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Closing MongoDB connection...');
    await this.connection.close();
    this.logger.log('MongoDB connection closed.');
  }
}
