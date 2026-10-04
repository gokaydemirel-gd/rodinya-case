import { UserRepositoryPort } from './ports/user-repository.port';
import { MongooseUserRepository } from './adapters/db/mongoose-user.repository';
import { UserController } from './presentation/user.controller';
import { Module } from '@nestjs/common';
import { userProviders } from './user.provider';

@Module({
  controllers: [UserController],
  providers: [
    ...userProviders,
    { provide: UserRepositoryPort, useClass: MongooseUserRepository },
  ],
  exports: [UserRepositoryPort],
})
export class UserModule {}
