import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AlsService } from '../../common/als/als.service';
import { IS_PUBLIC } from '../../common/auth/public.decorator';
import { AuthenticationError } from '../../common/custom-errors';
import { UserRepositoryPort } from '../user/ports/user-repository.port';
import { TokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: UserRepositoryPort,
    private readonly als: AlsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();
    const match = /^Bearer ([^\s]+)$/i.exec(
      request.headers.authorization ?? '',
    );
    if (!match) throw new AuthenticationError();
    const userId = await this.tokens.verify(match[1], 'access');
    const user = await this.users.findById(userId);
    if (!user) throw new AuthenticationError();
    this.als.setUser(user);
    return true;
  }
}
