import type { Model } from 'mongoose';
import type { MediaDocument } from '../../schemas/media.schema';

export const MEDIA_MODEL = Symbol('MEDIA_MODEL');
export type MediaModel = Model<MediaDocument>;
