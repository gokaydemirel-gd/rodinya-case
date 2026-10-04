import { Schema, type Document, type Types } from 'mongoose';

export interface Media {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  fileName: string;
  filePath: string;
  mimeType: string;
  size: number;
  allowedUserIds: Types.ObjectId[];
  createdAt: Date;
  deletingAt: Date | null;
}

export type MediaDocument = Document<Types.ObjectId> & Omit<Media, '_id'>;

export const mediaSchema = new Schema<MediaDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      enum: ['image/jpeg'],
    },
    size: {
      type: Number,
      required: true,
    },
    deletingAt: { type: Date, default: null },
    allowedUserIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'media',
  },
);

mediaSchema.index({ ownerId: 1, deletingAt: 1, createdAt: -1, _id: -1 });
