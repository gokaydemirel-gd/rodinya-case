import type { FactoryProvider } from '@nestjs/common';
import type { Connection } from 'mongoose';
import { DATABASE_CONNECTION } from '../../common/database/database.tokens';
import { USER_MODEL, type UserModel } from './adapters/db/user.tokens';
import { userSchema } from './schemas/user.schema';

export const userProviders: FactoryProvider<UserModel>[] = [
  {
    provide: USER_MODEL,
    inject: [DATABASE_CONNECTION],
    useFactory: (connection: Connection): UserModel =>
      connection.model('User', userSchema),
  },
];
