import { Injectable } from '@nestjs/common';
import { AuthenticationError } from '../../common/custom-errors';
import { UserRepositoryPort } from '../user/ports/user-repository.port';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(email: string, password: string) {
    const user = await this.users.create(
      email,
      await this.passwords.hash(password),
    );
    const tokens = await this.tokens.issue(user.id);
    await this.users.setRefreshToken(
      user.id,
      this.tokens.hash(tokens.refreshToken),
    );
    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const credentials = await this.users.findCredentials(email);
    if (
      !credentials ||
      !(await this.passwords.verify(password, credentials.passwordHash))
    ) {
      throw new AuthenticationError('E-posta veya şifre hatalı.');
    }
    const tokens = await this.tokens.issue(credentials.user.id);
    await this.users.setRefreshToken(
      credentials.user.id,
      this.tokens.hash(tokens.refreshToken),
    );
    return { user: credentials.user, ...tokens };
  }

  async refresh(refreshToken: string) {
    const userId = await this.tokens.verify(refreshToken, 'refresh');
    const user = await this.users.findById(userId);
    if (!user) throw new AuthenticationError();
    const tokens = await this.tokens.issue(userId);
    const rotated = await this.users.rotateRefreshToken(
      userId,
      this.tokens.hash(refreshToken),
      this.tokens.hash(tokens.refreshToken),
    );
    if (!rotated)
      throw new AuthenticationError(
        'Refresh token geçersiz veya daha önce kullanılmış.',
      );
    return tokens;
  }
}
