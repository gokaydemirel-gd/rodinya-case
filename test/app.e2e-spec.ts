import type { Server } from 'node:http';
import type { Response } from 'supertest';
import type { SuccessResponse } from '../src/app.response';
import type { TokenPair } from '../src/modules/auth/token.service';

function responseData<T>(response: Response): T {
  return (response.body as SuccessResponse<T>).data;
}

import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import mongoose from 'mongoose';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';
import { APP_CONFIG } from '../src/common/config/config.tokens';
import { DATABASE_CONNECTION } from '../src/common/database/database.tokens';
import type { AuthenticatedUser } from '../src/common/auth/authenticated-user';
import { UserAlreadyExistsError } from '../src/common/custom-errors';
import {
  UserRepositoryPort,
  type UserCredentials,
} from '../src/modules/user/ports/user-repository.port';
import {
  MediaRepositoryPort,
  type MediaRecord,
  type MediaPage,
} from '../src/modules/media/ports/media-repository.port';

describe('Case API (HTTP integration, in-memory repositories)', () => {
  let app: INestApplication<Server>;
  let connection: mongoose.Connection;
  let uploadDir: string;
  let owner: { id: string; token: string; refresh: string };
  let viewer: { id: string; token: string; refresh: string };
  let outsider: { id: string; token: string; refresh: string };
  let mediaId: string;
  const credentials = new Map<string, UserCredentials>();
  const refreshHashes = new Map<string, string>();
  const records = new Map<string, MediaRecord>();
  const jpeg = readFileSync(join(__dirname, 'fixtures/pixel.jpg'));
  const accessSecret = 'access-test-secret-'.repeat(3);
  const refreshSecret = 'refresh-test-secret-'.repeat(3);

  const users: UserRepositoryPort = {
    create: (email, passwordHash) => {
      if ([...credentials.values()].some((entry) => entry.user.email === email))
        return Promise.reject(new UserAlreadyExistsError());
      const user: AuthenticatedUser = {
        id: new mongoose.Types.ObjectId().toHexString(),
        email,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      credentials.set(user.id, { user, passwordHash });
      return Promise.resolve(user);
    },
    findById: (id) => Promise.resolve(credentials.get(id)?.user ?? null),
    findCredentials: (email) =>
      Promise.resolve(
        [...credentials.values()].find((entry) => entry.user.email === email) ??
          null,
      ),
    setRefreshToken: (id, hash) => {
      refreshHashes.set(id, hash);
      return Promise.resolve();
    },
    rotateRefreshToken: (id, previous, next) => {
      if (refreshHashes.get(id) !== previous) return Promise.resolve(false);
      refreshHashes.set(id, next);
      return Promise.resolve(true);
    },
  };
  const media: MediaRepositoryPort = {
    create: (input) => {
      const record = {
        ...input,
        allowedUserIds: input.allowedUserIds ?? [],
        id: new mongoose.Types.ObjectId().toHexString(),
        createdAt: new Date(),
      };
      records.set(record.id, record);
      return Promise.resolve(record);
    },
    findById: (id) =>
      Promise.resolve(
        records.get(id)?.deletingAt ? null : (records.get(id) ?? null),
      ),
    findByIdForDeletion: (id) => Promise.resolve(records.get(id) ?? null),
    markForDeletion: (id, ownerId) => {
      const record = records.get(id);
      if (!record || record.ownerId !== ownerId) return Promise.resolve(false);
      record.deletingAt = new Date();
      return Promise.resolve(true);
    },
    findByOwnerId: (id, { page, limit }) => {
      const list = [...records.values()]
        .filter((item) => item.ownerId === id && !item.deletingAt)
        .sort(
          (a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime() ||
            b.id.localeCompare(a.id),
        );
      return Promise.resolve({
        items: list.slice((page - 1) * limit, page * limit),
        total: list.length,
        page,
        limit,
        totalPages: Math.ceil(list.length / limit),
      });
    },
    deleteById: (id) => Promise.resolve(records.delete(id)),
    addPermission: (id, userId) => {
      const record = records.get(id);
      if (record && !record.allowedUserIds.includes(userId))
        record.allowedUserIds.push(userId);
      return Promise.resolve(!!record);
    },
    removePermission: (id, userId) => {
      const record = records.get(id);
      if (record)
        record.allowedUserIds = record.allowedUserIds.filter(
          (value) => value !== userId,
        );
      return Promise.resolve(!!record);
    },
    getPermissions: (id) =>
      Promise.resolve(records.get(id)?.allowedUserIds ?? null),
  };

  beforeAll(async () => {
    uploadDir = await mkdtemp(join(tmpdir(), 'rodinya-test-'));
    connection = mongoose.createConnection();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONNECTION)
      .useValue(connection)
      .overrideProvider(APP_CONFIG)
      .useValue({
        port: 3000,
        mongoUri: '',
        jwt: { accessSecret, refreshSecret },
        storage: { uploadDir, maxFileSize: 5242880 },
      })
      .overrideProvider(UserRepositoryPort)
      .useValue(users)
      .overrideProvider(MediaRepositoryPort)
      .useValue(media)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await connection?.destroy();
    if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
  });

  async function register(email: string) {
    const result = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'Passw0rd!' })
      .expect(201);
    expect(result.body).toMatchObject({
      success: true,
      statusCode: 201,
      data: { tokenType: 'Bearer' },
    });
    expect(
      responseData<TokenPair & { user: AuthenticatedUser }>(result).user,
    ).not.toHaveProperty('passwordHash');
    expect(
      responseData<TokenPair & { user: AuthenticatedUser }>(result).user,
    ).not.toHaveProperty('refreshTokenHash');
    return {
      id: responseData<TokenPair & { user: AuthenticatedUser }>(result).user.id,
      token: responseData<TokenPair>(result).accessToken,
      refresh: responseData<TokenPair>(result).refreshToken,
    };
  }

  it('registers users and returns standard errors for duplicate/invalid input', async () => {
    owner = await register('Owner@example.com');
    viewer = await register('viewer@example.com');
    outsider = await register('outsider@example.com');
    const duplicate = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'OWNER@example.com', password: 'Passw0rd!' })
      .expect(409);
    expect(duplicate.body).toMatchObject({ success: false, statusCode: 409 });
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'bad', password: 'short' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'Passw0rd!',
        role: 'admin',
      })
      .expect(400);
    expect(credentials.get(owner.id)?.passwordHash).toMatch(/^scrypt:/);
  });

  it('logs in, rejects bad passwords, and isolates ALS across concurrent users', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'WrongPass!' })
      .expect(401);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'Passw0rd!' })
      .expect(200);
    owner.token = responseData<TokenPair>(login).accessToken;
    owner.refresh = responseData<TokenPair>(login).refreshToken;
    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .get('/api/users/me')
        .auth(owner.token, { type: 'bearer' })
        .expect(200),
      request(app.getHttpServer())
        .get('/api/users/me')
        .auth(viewer.token, { type: 'bearer' })
        .expect(200),
    ]);
    expect(responseData<AuthenticatedUser>(a).id).toBe(owner.id);
    expect(responseData<AuthenticatedUser>(b).id).toBe(viewer.id);
    expect(responseData<AuthenticatedUser>(a)).not.toHaveProperty(
      'passwordHash',
    );
  });

  it('rejects missing, forged, expired and refresh tokens on protected endpoints', async () => {
    for (const path of [
      '/api/users/me',
      '/api/media/my',
      '/api/media/abc',
      '/api/media/abc/download',
      '/api/media/abc/permissions',
    ]) {
      await request(app.getHttpServer()).get(path).expect(401);
    }
    for (const [method, path] of [
      ['post', '/api/media/upload'],
      ['post', '/api/media/abc/permissions'],
      ['delete', '/api/media/abc'],
    ] as const) {
      await request(app.getHttpServer())[method](path).expect(401);
    }
    const jwt = new JwtService();
    const expired = jwt.sign(
      { sub: owner.id, type: 'access' },
      {
        secret: accessSecret,
        algorithm: 'HS256',
        issuer: 'rodinya-case',
        audience: 'rodinya-api',
        expiresIn: -1,
      },
    );
    for (const token of ['invalid', owner.refresh, expired])
      await request(app.getHttpServer())
        .get('/api/users/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
  });

  it('validates media path IDs through the DTO before querying the repository', async () => {
    const find = jest.spyOn(media, 'findById');
    const findForDeletion = jest.spyOn(media, 'findByIdForDeletion');
    try {
      for (const [method, suffix] of [
        ['get', ''],
        ['get', '/download'],
        ['delete', ''],
        ['get', '/permissions'],
        ['post', '/permissions'],
      ] as const) {
        const result = await request(app.getHttpServer())
          [method](`/api/media/invalid-id${suffix}`)
          .auth(owner.token, { type: 'bearer' })
          .send(
            method === 'post'
              ? { userId: viewer.id, action: 'add' }
              : undefined,
          )
          .expect(400);
        expect(result.body).toMatchObject({
          success: false,
          statusCode: 400,
          error: { message: ['Geçersiz medya kimliği.'] },
        });
      }
      expect(find).not.toHaveBeenCalled();
      expect(findForDeletion).not.toHaveBeenCalled();
      await request(app.getHttpServer())
        .get(`/api/media/${new mongoose.Types.ObjectId().toHexString()}`)
        .auth(owner.token, { type: 'bearer' })
        .expect(404);
    } finally {
      find.mockRestore();
      findForDeletion.mockRestore();
    }
  });

  it('rotates refresh tokens atomically and rejects reuse or access tokens', async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .send({ refreshToken: owner.refresh }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 401]);
    const renewed = responses.find((r) => r.status === 200)!;
    owner.token = responseData<TokenPair>(renewed).accessToken;
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: owner.refresh })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken: owner.token })
      .expect(401);
  });

  it('validates JPEG content and file size, then stores a real file and record', async () => {
    await request(app.getHttpServer())
      .post('/api/media/upload')
      .auth(owner.token, { type: 'bearer' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/media/upload')
      .auth(owner.token, { type: 'bearer' })
      .attach('file', Buffer.from('not a jpeg'), {
        filename: 'fake.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/media/upload')
      .auth(owner.token, { type: 'bearer' })
      .attach('file', Buffer.alloc(5242881), {
        filename: 'large.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
    const uploaded = await request(app.getHttpServer())
      .post('/api/media/upload')
      .auth(owner.token, { type: 'bearer' })
      .attach('file', jpeg, {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect((response) => {
        if (response.status !== 201)
          throw new Error(JSON.stringify(response.body));
      })
      .expect(201);
    mediaId = responseData<MediaRecord>(uploaded).id;
    expect(responseData<MediaRecord>(uploaded)).not.toHaveProperty('filePath');
    expect(await readdir(uploadDir)).toHaveLength(1);
  });

  it('validates pagination and returns page metadata', async () => {
    for (const query of [
      'limit=101',
      'limit=0',
      'page=0',
      'page=1.5',
      'limit=abc',
      'page=10001',
    ]) {
      await request(app.getHttpServer())
        .get('/api/media/my?' + query)
        .auth(owner.token, { type: 'bearer' })
        .expect(400);
    }
    const first = await request(app.getHttpServer())
      .get('/api/media/my?page=1&limit=1')
      .auth(owner.token, { type: 'bearer' })
      .expect(200);
    expect(responseData<MediaPage>(first)).toMatchObject({
      total: 1,
      page: 1,
      limit: 1,
      totalPages: 1,
    });
    expect(responseData<MediaPage>(first).items).toHaveLength(1);
    const next = await request(app.getHttpServer())
      .get('/api/media/my?page=2&limit=1')
      .auth(owner.token, { type: 'bearer' })
      .expect(200);
    expect(responseData<MediaPage>(next).items).toEqual([]);
  });

  it('lists only owned media and enforces grant/revoke/owner-only actions', async () => {
    const mine = await request(app.getHttpServer())
      .get('/api/media/my')
      .auth(owner.token, { type: 'bearer' })
      .expect(200);
    expect(responseData<MediaPage>(mine).items).toHaveLength(1);
    const theirs = await request(app.getHttpServer())
      .get('/api/media/my')
      .auth(viewer.token, { type: 'bearer' })
      .expect(200);
    expect(responseData<MediaPage>(theirs).items).toEqual([]);
    await request(app.getHttpServer())
      .get(`/api/media/${mediaId}/download`)
      .auth(viewer.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/media/${mediaId}/permissions`)
      .auth(owner.token, { type: 'bearer' })
      .send({ userId: viewer.id, action: 'invalid' })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/media/${mediaId}/permissions`)
      .auth(owner.token, { type: 'bearer' })
      .send({
        userId: new mongoose.Types.ObjectId().toHexString(),
        action: 'add',
      })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/media/${mediaId}/permissions`)
      .auth(owner.token, { type: 'bearer' })
      .send({ userId: viewer.id, action: 'add' })
      .expect(200);
    const downloaded = await request(app.getHttpServer())
      .get(`/api/media/${mediaId}/download`)
      .auth(viewer.token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', 'image/jpeg');
    expect(downloaded.body).toEqual(jpeg);
    await request(app.getHttpServer())
      .get(`/api/media/${mediaId}`)
      .auth(viewer.token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/media/${mediaId}`)
      .auth(outsider.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/media/${mediaId}/permissions`)
      .auth(owner.token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/media/${mediaId}/permissions`)
      .auth(viewer.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/media/${mediaId}`)
      .auth(viewer.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/media/${mediaId}/permissions`)
      .auth(viewer.token, { type: 'bearer' })
      .send({ userId: outsider.id, action: 'add' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/media/${mediaId}/permissions`)
      .auth(owner.token, { type: 'bearer' })
      .send({ userId: viewer.id, action: 'remove' })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/media/${mediaId}/download`)
      .auth(viewer.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/media/${mediaId}`)
      .auth(owner.token, { type: 'bearer' })
      .expect(200);
    expect(await readdir(uploadDir)).toEqual([]);
    await request(app.getHttpServer())
      .get(`/api/media/${mediaId}`)
      .auth(owner.token, { type: 'bearer' })
      .expect(404);
  });

  it('hides pending deletion and lets the owner retry after database failure', async () => {
    const uploaded = await request(app.getHttpServer())
      .post('/api/media/upload')
      .auth(owner.token, { type: 'bearer' })
      .attach('file', jpeg, {
        filename: 'retry.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);
    const id = responseData<MediaRecord>(uploaded).id;
    const remove = jest
      .spyOn(media, 'deleteById')
      .mockRejectedValueOnce(new Error('Simulated database delete failure'));
    try {
      const failed = await request(app.getHttpServer())
        .delete(`/api/media/${id}`)
        .auth(owner.token, { type: 'bearer' })
        .expect(500);
      expect(failed.body).toMatchObject({ success: false, statusCode: 500 });
      expect(failed.headers['x-request-id']).toBeDefined();
      expect(records.get(id)?.deletingAt).toBeInstanceOf(Date);
      expect(await readdir(uploadDir)).toEqual([]);
      await request(app.getHttpServer())
        .get(`/api/media/${id}`)
        .auth(owner.token, { type: 'bearer' })
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/media/${id}/download`)
        .auth(owner.token, { type: 'bearer' })
        .expect(404);
      const listed = await request(app.getHttpServer())
        .get('/api/media/my')
        .auth(owner.token, { type: 'bearer' })
        .expect(200);
      expect(responseData<MediaPage>(listed).total).toBe(0);
      await request(app.getHttpServer())
        .delete(`/api/media/${id}`)
        .auth(viewer.token, { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/api/media/${id}`)
        .auth(owner.token, { type: 'bearer' })
        .expect(200);
      expect(records.has(id)).toBe(false);
    } finally {
      remove.mockRestore();
    }
  });

  it('provides public health, standard 404 responses and Swagger security', async () => {
    await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect({ success: true, statusCode: 200, data: 'Hello World!' });
    const health = await request(app.getHttpServer())
      .get('/api/health')
      .expect(503);
    expect(health.body).toMatchObject({ success: false, statusCode: 503 });
    const missing = await request(app.getHttpServer())
      .get('/api/missing')
      .expect(404);
    expect(missing.body).toMatchObject({ success: false, statusCode: 404 });
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(doc.paths['/api/auth/register']).toBeDefined();
    expect(doc.paths['/api/media/my'].get?.parameters).toEqual([
      {
        name: 'page',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 1, minimum: 1, maximum: 10000 },
      },
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
      },
    ]);
    expect(doc.components?.schemas?.MediaDto).toMatchObject({
      properties: { createdAt: { type: 'string', format: 'date-time' } },
    });
    expect(doc.components?.schemas?.MediaDto).not.toHaveProperty(
      'properties.filePath',
    );
    expect(doc.components?.schemas?.AuthResponseDto).toHaveProperty(
      'properties.user',
    );
    expect(doc.components?.schemas?.MediaPermissionsDto).toHaveProperty(
      'properties.allowedUserIds',
    );
    expect(doc.paths['/api/users/me'].get?.security).toEqual([{ bearer: [] }]);
    expect(
      doc.paths['/api/media/{id}/download'].get?.responses['403'],
    ).toBeDefined();
  });
});
