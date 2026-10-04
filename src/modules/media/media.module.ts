import { MediaAccessService } from './services/media-access.service';
import { MulterModule } from '@nestjs/platform-express';
import { APP_CONFIG } from '../../common/config/config.tokens';
import type { AppConfig } from '../../common/config/app.config';
import { UserModule } from '../user/user.module';
import { UserRepositoryPort } from '../user/ports/user-repository.port';
import { Module } from '@nestjs/common';
import { mediaProviders } from './media.provider';
import { MediaRepositoryPort } from './ports/media-repository.port';
import { MediaStoragePort } from './ports/media-storage.port';
import { MongooseMediaRepository } from './adapters/db/mongoose-media.repository';
import { LocalMediaStorage } from './adapters/storage/local-media.storage';
import { UploadMediaUseCase } from './use-cases/upload-media.use-case';
import { GetMyMediaUseCase } from './use-cases/get-my-media.use-case';
import { GetMediaByIdUseCase } from './use-cases/get-media-by-id.use-case';
import { DownloadMediaUseCase } from './use-cases/download-media.use-case';
import { DeleteMediaUseCase } from './use-cases/delete-media.use-case';
import { ManagePermissionsUseCase } from './use-cases/manage-permissions.use-case';
import { MediaController } from './presentation/media.controller';

@Module({
  imports: [
    UserModule,
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        limits: { fileSize: config.storage.maxFileSize, files: 1, fields: 0 },
      }),
    }),
  ],
  controllers: [MediaController],
  providers: [
    ...mediaProviders,
    {
      provide: MediaAccessService,
      inject: [MediaRepositoryPort],
      useFactory: (repository: MediaRepositoryPort) =>
        new MediaAccessService(repository),
    },
    {
      provide: MediaRepositoryPort,
      useClass: MongooseMediaRepository,
    },
    {
      provide: MediaStoragePort,
      useClass: LocalMediaStorage,
    },
    {
      provide: UploadMediaUseCase,
      inject: [MediaRepositoryPort, MediaStoragePort, APP_CONFIG],
      useFactory: (
        repository: MediaRepositoryPort,
        storage: MediaStoragePort,
        config: AppConfig,
      ) =>
        new UploadMediaUseCase(repository, storage, config.storage.maxFileSize),
    },
    {
      provide: GetMyMediaUseCase,
      inject: [MediaRepositoryPort],
      useFactory: (repository: MediaRepositoryPort) =>
        new GetMyMediaUseCase(repository),
    },
    {
      provide: GetMediaByIdUseCase,
      inject: [MediaAccessService],
      useFactory: (access: MediaAccessService) =>
        new GetMediaByIdUseCase(access),
    },
    {
      provide: DownloadMediaUseCase,
      inject: [MediaAccessService, MediaStoragePort],
      useFactory: (access: MediaAccessService, storage: MediaStoragePort) =>
        new DownloadMediaUseCase(access, storage),
    },
    {
      provide: DeleteMediaUseCase,
      inject: [MediaRepositoryPort, MediaStoragePort, MediaAccessService],
      useFactory: (
        repository: MediaRepositoryPort,
        storage: MediaStoragePort,
        access: MediaAccessService,
      ) => new DeleteMediaUseCase(repository, storage, access),
    },
    {
      provide: ManagePermissionsUseCase,
      inject: [MediaRepositoryPort, UserRepositoryPort, MediaAccessService],
      useFactory: (
        repository: MediaRepositoryPort,
        users: UserRepositoryPort,
        access: MediaAccessService,
      ) => new ManagePermissionsUseCase(repository, users, access),
    },
  ],
})
export class MediaModule {}
