import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';

export interface UserCredentials {
  user: AuthenticatedUser;
  passwordHash: string;
}

export abstract class UserRepositoryPort {
  abstract create(
    email: string,
    passwordHash: string,
  ): Promise<AuthenticatedUser>;
  abstract findById(id: string): Promise<AuthenticatedUser | null>;
  abstract findCredentials(email: string): Promise<UserCredentials | null>;
  abstract setRefreshToken(id: string, hash: string): Promise<void>;
  abstract rotateRefreshToken(
    id: string,
    previousHash: string,
    nextHash: string,
  ): Promise<boolean>;
}
