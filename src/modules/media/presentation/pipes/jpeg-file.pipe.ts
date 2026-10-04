import { Injectable, type PipeTransform } from '@nestjs/common';
import { decode } from 'jpeg-js';
import {
  InvalidMediaFileError,
  InvalidMediaMimeTypeError,
} from '../../../../common/custom-errors';

export interface UploadedMediaFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class JpegFilePipe implements PipeTransform<
  UploadedMediaFile | undefined,
  UploadedMediaFile
> {
  transform(file: UploadedMediaFile | undefined): UploadedMediaFile {
    if (!file?.buffer?.length) throw new InvalidMediaFileError();
    if (!['image/jpeg', 'image/jpg'].includes(file.mimetype.toLowerCase()))
      throw new InvalidMediaMimeTypeError();
    try {
      decode(file.buffer, {
        useTArray: true,
        maxMemoryUsageInMB: 64,
        tolerantDecoding: false,
      });
    } catch {
      throw new InvalidMediaFileError(
        'Dosya geçerli bir JPEG olmalı ve çözümleme bellek sınırını aşmamalı.',
      );
    }
    return file;
  }
}
