import type { Model } from 'mongoose';
import type { UserDocument } from '../../schemas/user.schema';

export const USER_MODEL = Symbol('USER_MODEL');
export type UserModel = Model<UserDocument>;
