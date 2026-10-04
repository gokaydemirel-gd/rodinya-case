import {
  Global,
  Module,
  type MiddlewareConsumer,
  type NestModule,
} from '@nestjs/common';
import { AlsMiddleware } from './als.middleware';
import { AlsService } from './als.service';

@Global()
@Module({
  providers: [AlsService, AlsMiddleware],
  exports: [AlsService],
})
export class AlsModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AlsMiddleware).forRoutes('*');
  }
}
