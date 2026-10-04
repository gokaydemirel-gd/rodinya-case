import { Inject, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserAlreadyExistsError } from '../../../../common/custom-errors';
import type { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import {
  UserRepositoryPort,
  type UserCredentials,
} from '../../ports/user-repository.port';
import { USER_MODEL, type UserModel } from './user.tokens';
import type { UserDocument } from '../../schemas/user.schema';

@Injectable()
export class MongooseUserRepository extends UserRepositoryPort {
  constructor(@Inject(USER_MODEL) private readonly model: UserModel) {
    super();
  }

  private toUser(doc: UserDocument): AuthenticatedUser {
    return {
      id: doc._id.toHexString(),
      email: doc.email,
      role: doc.role,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async create(
    email: string,
    passwordHash: string,
  ): Promise<AuthenticatedUser> {
    try {
      return this.toUser(
        await this.model.create({ email, passwordHash, role: 'user' }),
      );
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new UserAlreadyExistsError();
      }
      throw error;
    }
  }

  async findById(id: string): Promise<AuthenticatedUser | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.model.findById(id).exec();
    return doc ? this.toUser(doc) : null;
  }

  async findCredentials(email: string): Promise<UserCredentials | null> {
    const doc = await this.model
      .findOne({ email })
      .select('+passwordHash')
      .exec();
    return doc
      ? { user: this.toUser(doc), passwordHash: doc.passwordHash }
      : null;
  }

  async setRefreshToken(id: string, hash: string): Promise<void> {
    await this.model
      .updateOne({ _id: id }, { $set: { refreshTokenHash: hash } })
      .exec();
  }

  async rotateRefreshToken(
    id: string,
    previousHash: string,
    nextHash: string,
  ): Promise<boolean> {
    const result = await this.model
      .updateOne(
        { _id: id, refreshTokenHash: previousHash },
        { $set: { refreshTokenHash: nextHash } },
      )
      .exec();
    return result.modifiedCount === 1;
  }
}
