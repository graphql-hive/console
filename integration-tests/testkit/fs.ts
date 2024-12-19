import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function tmpFile(extension: string) {
  const dir = tmpdir();
  const fileName = randomUUID();
  const filepath = join(dir, `${fileName}.${extension}`);

  return {
    filepath,
    read() {
      return readFile(filepath, 'utf-8');
    },
  };
}
