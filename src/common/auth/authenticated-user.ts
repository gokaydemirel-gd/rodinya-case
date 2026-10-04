import type { UserRole } from './user-role';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
