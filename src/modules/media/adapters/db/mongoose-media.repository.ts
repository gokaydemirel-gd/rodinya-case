import { Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { MEDIA_MODEL, type MediaModel } from './media.tokens';
import type { MediaDocument } from '../../schemas/media.schema';
import {
  MediaRepositoryPort,
  type CreateMediaRecordInput,
  type MediaRecord,
  type MediaPage,
  type MediaPageOptions,
} from '../../ports/media-repository.port';

@Injectable()
export class MongooseMediaRepository extends MediaRepositoryPort {
  constructor(@Inject(MEDIA_MODEL) private readonly mediaModel: MediaModel) {
    super();
  }

  private toRecord(doc: MediaDocument): MediaRecord {
    return {
      id: doc._id.toHexString(),
      ownerId: doc.ownerId.toHexString(),
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      size: doc.size,
      allowedUserIds: (doc.allowedUserIds ?? []).map((id) => id.toHexString()),
      createdAt: doc.createdAt,
      deletingAt: doc.deletingAt ?? null,
    };
  }

  async create(input: CreateMediaRecordInput): Promise<MediaRecord> {
    const created = await this.mediaModel.create({
      ...input,
      ownerId: new Types.ObjectId(input.ownerId),
      allowedUserIds: (input.allowedUserIds ?? []).map(
        (id) => new Types.ObjectId(id),
      ),
    });
    return this.toRecord(created);
  }

  findById(id: string): Promise<MediaRecord | null> {
    return this.find(id, false);
  }
  findByIdForDeletion(id: string): Promise<MediaRecord | null> {
    return this.find(id, true);
  }

  private async find(
    id: string,
    includeDeleting: boolean,
  ): Promise<MediaRecord | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.mediaModel
      .findOne({ _id: id, ...(includeDeleting ? {} : { deletingAt: null }) })
      .exec();
    return doc ? this.toRecord(doc) : null;
  }

  async findByOwnerId(
    ownerId: string,
    { page, limit }: MediaPageOptions,
  ): Promise<MediaPage> {
    if (!Types.ObjectId.isValid(ownerId))
      return { items: [], total: 0, page, limit, totalPages: 0 };
    const filter = { ownerId: new Types.ObjectId(ownerId), deletingAt: null };
    const [docs, total] = await Promise.all([
      this.mediaModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.mediaModel.countDocuments(filter).exec(),
    ]);
    return {
      items: docs.map((doc) => this.toRecord(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markForDeletion(id: string, ownerId: string): Promise<boolean> {
    const result = await this.mediaModel
      .updateOne({ _id: id, ownerId }, { $set: { deletingAt: new Date() } })
      .exec();
    return result.matchedCount > 0;
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.mediaModel
      .deleteOne({ _id: id, deletingAt: { $ne: null } })
      .exec();
    return result.deletedCount > 0;
  }

  async addPermission(id: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId))
      return false;
    const result = await this.mediaModel
      .updateOne(
        { _id: id, deletingAt: null },
        { $addToSet: { allowedUserIds: new Types.ObjectId(userId) } },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  async removePermission(id: string, userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(userId))
      return false;
    const result = await this.mediaModel
      .updateOne(
        { _id: id, deletingAt: null },
        { $pull: { allowedUserIds: new Types.ObjectId(userId) } },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  async getPermissions(id: string): Promise<string[] | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.mediaModel
      .findOne({ _id: id, deletingAt: null }, { allowedUserIds: 1 })
      .exec();
    return doc
      ? (doc.allowedUserIds ?? []).map((uid) => uid.toHexString())
      : null;
  }
}
