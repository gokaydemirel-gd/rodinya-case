import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './health.controller';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AlsModule } from './common/als/als.module';
import { ConfigModule } from './common/config/config.module';
import { DatabaseModule } from './common/database/database.module';
import { UserModule } from './modules/user/user.module';
import { MediaModule } from './modules/media/media.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    AlsModule,
    ConfigModule,
    DatabaseModule,
    UserModule,
    AuthModule,
    MediaModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}
