import { Schema, type Document, type Types } from 'mongoose';

import type { UserRole } from '../../../common/auth/user-role';

export interface User {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  refreshTokenHash?: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = Document<Types.ObjectId> & Omit<User, '_id'>;

export const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    refreshTokenHash: { type: String, select: false },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.passwordHash;
        delete ret.refreshTokenHash;
        return ret;
      },
    },
  },
);
