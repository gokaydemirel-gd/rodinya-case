import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalMediaStorage } from './local-media.storage';
import type { AppConfig } from '../../../../common/config/app.config';

describe('LocalMediaStorage deletion', () => {
  let directory: string;
  let storage: LocalMediaStorage;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'rodinya-storage-'));
    storage = new LocalMediaStorage({
      storage: { uploadDir: directory, maxFileSize: 5242880 },
    } as AppConfig);
  });
  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('allows retrying deletion after the file is already gone', async () => {
    const path = join(directory, 'file.jpg');
    await writeFile(path, 'file');
    await storage.delete(path);
    await expect(storage.delete(path)).resolves.toBeUndefined();
  });

  it('propagates filesystem failures other than missing files', async () => {
    await expect(storage.delete(directory)).rejects.toThrow();
    const file = join(directory, 'not-a-directory');
    await writeFile(file, 'file');
    await expect(storage.exists(join(file, 'child.jpg'))).rejects.toThrow();
  });
});
