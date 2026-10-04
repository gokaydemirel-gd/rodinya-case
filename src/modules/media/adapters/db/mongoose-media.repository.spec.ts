import { Types } from 'mongoose';
import { MongooseMediaRepository } from './mongoose-media.repository';
import type { MediaModel } from './media.tokens';

const id = new Types.ObjectId().toHexString();
const ownerId = new Types.ObjectId().toHexString();

describe('MongooseMediaRepository', () => {
  it('reads current permissions on every lookup without caching results', async () => {
    const doc = {
      _id: new Types.ObjectId(id),
      ownerId: new Types.ObjectId(ownerId),
      allowedUserIds: [new Types.ObjectId(ownerId)],
    };
    const exec = jest
      .fn()
      .mockResolvedValueOnce(doc)
      .mockResolvedValueOnce({ ...doc, allowedUserIds: [] });
    const findOne = jest.fn().mockReturnValue({ exec });
    const repo = new MongooseMediaRepository({
      findOne,
    } as unknown as MediaModel);
    expect((await repo.findById(id))?.allowedUserIds).toEqual([ownerId]);
    expect((await repo.findById(id))?.allowedUserIds).toEqual([]);
    expect(exec).toHaveBeenCalledTimes(2);
    expect(findOne).toHaveBeenCalledWith({ _id: id, deletingAt: null });
  });

  it('separates active reads from reads used to resume deletion', async () => {
    const findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const repo = new MongooseMediaRepository({
      findOne,
    } as unknown as MediaModel);
    await repo.findById(id);
    await repo.findByIdForDeletion(id);
    expect(findOne).toHaveBeenNthCalledWith(1, { _id: id, deletingAt: null });
    expect(findOne).toHaveBeenNthCalledWith(2, { _id: id });
  });

  it('bounds and stably sorts the page using the same active filter as the count', async () => {
    const limit = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const find = jest.fn().mockReturnValue({ sort });
    const countDocuments = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(25) });
    const repo = new MongooseMediaRepository({
      find,
      countDocuments,
    } as unknown as MediaModel);
    expect(await repo.findByOwnerId(ownerId, { page: 2, limit: 20 })).toEqual({
      items: [],
      page: 2,
      limit: 20,
      total: 25,
      totalPages: 2,
    });
    expect(find).toHaveBeenCalledWith({
      ownerId: new Types.ObjectId(ownerId),
      deletingAt: null,
    });
    expect(countDocuments).toHaveBeenCalledWith({
      ownerId: new Types.ObjectId(ownerId),
      deletingAt: null,
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(skip).toHaveBeenCalledWith(20);
    expect(limit).toHaveBeenCalledWith(20);
  });
});
