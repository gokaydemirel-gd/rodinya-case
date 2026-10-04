import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user';

export interface RequestContext {
  requestId: string;
  user?: AuthenticatedUser;
}

@Injectable()
export class AlsService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run({ ...context }, callback);
  }

  get requestId(): string | undefined {
    return this.storage.getStore()?.requestId;
  }
  get user(): AuthenticatedUser | undefined {
    return this.storage.getStore()?.user;
  }
  get userId(): string | undefined {
    return this.user?.id;
  }
  get role() {
    return this.user?.role;
  }

  setUser(user: AuthenticatedUser): void {
    const context = this.storage.getStore();
    if (!context) throw new Error('No active request context');
    context.user = { ...user };
  }
}
