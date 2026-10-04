import { GetMediaByIdUseCase } from './modules/media/use-cases/get-media-by-id.use-case';
import { MediaNotFoundError } from './common/custom-errors';
import { APP_CONFIG } from './common/config/config.tokens';
import { loadAppConfig } from './common/config/app.config';
import { Test } from '@nestjs/testing';
import mongoose from 'mongoose';
import { AppModule } from './app.module';
import { DATABASE_CONNECTION } from './common/database/database.tokens';
import { MediaModule } from './modules/media/media.module';
import { GetMyMediaUseCase } from './modules/media/use-cases/get-my-media.use-case';

describe('Application module wiring', () => {
  it('resolves the media use case with feature models on the shared connection', async () => {
    const connection = mongoose.createConnection();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue(connection)
      .overrideProvider(APP_CONFIG)
      .useValue({
        ...loadAppConfig(),
        jwt: { accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32) },
      })
      .compile();

    try {
      expect(connection.modelNames().sort()).toEqual(['Media', 'User']);
      const exec = jest.fn().mockResolvedValue([]);
      const limit = jest.fn().mockReturnValue({ exec });
      const skip = jest.fn().mockReturnValue({ limit });
      const sort = jest.fn().mockReturnValue({ skip });
      jest.spyOn(connection.models.Media, 'countDocuments').mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      } as unknown as ReturnType<
        typeof connection.models.Media.countDocuments
      >);
      const find = jest
        .spyOn(connection.models.Media, 'find')
        .mockReturnValue({ sort } as unknown as ReturnType<
          typeof connection.models.Media.find
        >);
      const useCase = module.select(MediaModule).get(GetMyMediaUseCase);
      const ownerId = new mongoose.Types.ObjectId();

      await expect(useCase.execute(ownerId.toHexString())).resolves.toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      expect(find).toHaveBeenCalledWith({ ownerId, deletingAt: null });
      const lookup = jest
        .spyOn(connection.models.Media, 'findOne')
        .mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        } as unknown as ReturnType<typeof connection.models.Media.findOne>);
      const details = module.get(GetMediaByIdUseCase);
      const mediaId = new mongoose.Types.ObjectId().toHexString();
      await expect(
        details.execute(mediaId, ownerId.toHexString()),
      ).rejects.toThrow(MediaNotFoundError);
      expect(lookup).toHaveBeenCalledTimes(1);
      await expect(
        details.execute(mediaId, ownerId.toHexString()),
      ).rejects.toThrow(MediaNotFoundError);
      expect(lookup).toHaveBeenCalledTimes(2);
    } finally {
      jest.restoreAllMocks();
      await module.close();
      await connection.destroy();
    }
  });
});
