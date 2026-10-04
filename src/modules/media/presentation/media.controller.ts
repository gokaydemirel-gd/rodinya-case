import { MediaIdParamsDto } from '../dto/media-id-params.dto';
import { MediaPageDto, MediaPageQueryDto } from '../dto/media-page.dto';
import { MediaDto } from '../dto/media.dto';
import { JpegFilePipe, type UploadedMediaFile } from './pipes/jpeg-file.pipe';
import {
  ApiBearerAuth,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import {
  ApiErrors,
  ApiSuccess,
  ApiSuccessDto,
} from '../../../common/swagger/api-response.decorator';
import type { MediaRecord } from '../ports/media-repository.port';

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Query,
  Post,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AlsService } from '../../../common/als/als.service';
import { UploadMediaUseCase } from '../use-cases/upload-media.use-case';
import { GetMyMediaUseCase } from '../use-cases/get-my-media.use-case';
import { GetMediaByIdUseCase } from '../use-cases/get-media-by-id.use-case';
import { DownloadMediaUseCase } from '../use-cases/download-media.use-case';
import { DeleteMediaUseCase } from '../use-cases/delete-media.use-case';
import { ManagePermissionsUseCase } from '../use-cases/manage-permissions.use-case';
import {
  ManagePermissionDto,
  MediaPermissionsDto,
} from '../dto/permission.dto';

function presentMedia(media: MediaRecord): MediaDto {
  return {
    id: media.id,
    ownerId: media.ownerId,
    fileName: media.fileName,
    mimeType: media.mimeType,
    size: media.size,
    allowedUserIds: media.allowedUserIds,
    createdAt: media.createdAt,
  };
}

@ApiTags('Media')
@ApiBearerAuth()
@ApiErrors(400, 401, 403, 404)
@Controller('media')
export class MediaController {
  constructor(
    @Inject(UploadMediaUseCase)
    private readonly uploadMediaUseCase: UploadMediaUseCase,
    @Inject(GetMyMediaUseCase)
    private readonly getMyMediaUseCase: GetMyMediaUseCase,
    @Inject(GetMediaByIdUseCase)
    private readonly getMediaByIdUseCase: GetMediaByIdUseCase,
    @Inject(DownloadMediaUseCase)
    private readonly downloadMediaUseCase: DownloadMediaUseCase,
    @Inject(DeleteMediaUseCase)
    private readonly deleteMediaUseCase: DeleteMediaUseCase,
    @Inject(ManagePermissionsUseCase)
    private readonly managePermissionsUseCase: ManagePermissionsUseCase,
    @Inject(AlsService)
    private readonly als: AlsService,
  ) {}

  private getAuthenticatedUserId(): string {
    const userId = this.als.userId;
    if (!userId) {
      throw new UnauthorizedException('Bu işlem için giriş yapmalısınız.');
    }
    return userId;
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiSuccessDto(201, MediaDto)
  @ApiErrors(413)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(JpegFilePipe)
    file: UploadedMediaFile,
  ): Promise<MediaDto> {
    const userId = this.getAuthenticatedUserId();
    const media = await this.uploadMediaUseCase.execute(
      userId,
      file
        ? {
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          }
        : undefined,
    );
    return presentMedia(media);
  }

  @Get('my')
  @ApiSuccessDto(200, MediaPageDto)
  async getMyMedia(@Query() query: MediaPageQueryDto): Promise<MediaPageDto> {
    const userId = this.getAuthenticatedUserId();
    const result = await this.getMyMediaUseCase.execute(userId, query);
    return { ...result, items: result.items.map(presentMedia) };
  }

  @Get(':id')
  @ApiSuccessDto(200, MediaDto)
  async getById(@Param() params: MediaIdParamsDto): Promise<MediaDto> {
    const userId = this.getAuthenticatedUserId();
    return presentMedia(
      await this.getMediaByIdUseCase.execute(params.id, userId),
    );
  }

  @Get(':id/download')
  @ApiProduces('image/jpeg')
  @ApiResponse({
    status: 200,
    description: 'JPEG dosya akışı; JSON response zarfı kullanılmaz.',
    schema: { type: 'string', format: 'binary' },
  })
  async download(@Param() params: MediaIdParamsDto) {
    const userId = this.getAuthenticatedUserId();
    const { stream, media } = await this.downloadMediaUseCase.execute(
      params.id,
      userId,
    );

    return new StreamableFile(stream, {
      type: media.mimeType,
      disposition: `attachment; filename="${media.id}.jpg"; filename*=UTF-8''${encodeURIComponent(media.fileName).replace(/['()*]/g, (char) => '%' + char.charCodeAt(0).toString(16))}`,
      length: media.size,
    });
  }

  @Delete(':id')
  @ApiSuccess(200, {
    type: 'object',
    properties: { message: { type: 'string' } },
  })
  @HttpCode(HttpStatus.OK)
  async delete(@Param() params: MediaIdParamsDto) {
    const userId = this.getAuthenticatedUserId();
    await this.deleteMediaUseCase.execute(params.id, userId);
    return { message: 'Medya başarıyla silindi.' };
  }

  @Get(':id/permissions')
  @ApiSuccessDto(200, MediaPermissionsDto)
  async getPermissions(
    @Param() params: MediaIdParamsDto,
  ): Promise<MediaPermissionsDto> {
    const userId = this.getAuthenticatedUserId();
    const allowedUserIds = await this.managePermissionsUseCase.getPermissions(
      params.id,
      userId,
    );
    return { mediaId: params.id, allowedUserIds };
  }

  @Post(':id/permissions')
  @HttpCode(200)
  @ApiSuccessDto(200, MediaPermissionsDto)
  async updatePermissions(
    @Param() params: MediaIdParamsDto,
    @Body() body: ManagePermissionDto,
  ): Promise<MediaPermissionsDto> {
    const userId = this.getAuthenticatedUserId();
    const updated = await this.managePermissionsUseCase.updatePermission(
      params.id,
      userId,
      body.userId,
      body.action,
    );
    return { mediaId: params.id, allowedUserIds: updated };
  }
}
