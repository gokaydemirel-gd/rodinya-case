import type { FactoryProvider } from '@nestjs/common';
import type { Connection } from 'mongoose';
import { DATABASE_CONNECTION } from '../../common/database/database.tokens';
import { MEDIA_MODEL, type MediaModel } from './adapters/db/media.tokens';
import { mediaSchema } from './schemas/media.schema';

export const mediaProviders: FactoryProvider<MediaModel>[] = [
  {
    provide: MEDIA_MODEL,
    inject: [DATABASE_CONNECTION],
    useFactory: (connection: Connection): MediaModel =>
      connection.model('Media', mediaSchema),
  },
];
