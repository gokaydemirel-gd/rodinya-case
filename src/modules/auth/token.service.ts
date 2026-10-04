import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'node:crypto';
import { APP_CONFIG } from '../../common/config/config.tokens';
import type { AppConfig } from '../../common/config/app.config';
import { AuthenticationError } from '../../common/custom-errors';

const ACCESS_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  jti: string;
}
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    const { accessSecret, refreshSecret } = config.jwt;
    if (
      accessSecret.length < 32 ||
      refreshSecret.length < 32 ||
      accessSecret === refreshSecret
    ) {
      throw new Error(
        'JWT secrets must be different and at least 32 characters long',
      );
    }
  }

  async issue(userId: string): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.sign(userId, 'access', ACCESS_TOKEN_TTL_SECONDS),
      this.sign(userId, 'refresh', REFRESH_TOKEN_TTL_SECONDS),
    ]);
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private sign(
    sub: string,
    type: TokenPayload['type'],
    expiresIn: number,
  ): Promise<string> {
    return this.jwt.signAsync(
      { sub, type },
      {
        secret:
          type === 'access'
            ? this.config.jwt.accessSecret
            : this.config.jwt.refreshSecret,
        algorithm: 'HS256',
        issuer: 'rodinya-case',
        audience: 'rodinya-api',
        jwtid: randomUUID(),
        expiresIn,
      },
    );
  }

  async verify(token: string, type: TokenPayload['type']): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token, {
        secret:
          type === 'access'
            ? this.config.jwt.accessSecret
            : this.config.jwt.refreshSecret,
        algorithms: ['HS256'],
        issuer: 'rodinya-case',
        audience: 'rodinya-api',
      });
      if (
        payload.type !== type ||
        typeof payload.sub !== 'string' ||
        !/^[a-f\d]{24}$/i.test(payload.sub)
      )
        throw new Error('Invalid claims');
      return payload.sub;
    } catch {
      throw new AuthenticationError('Token geçersiz veya süresi dolmuş.');
    }
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
