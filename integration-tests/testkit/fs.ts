import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TmpFile {
  filepath: string;
  read(): Promise<string>;
}

export function tmpFile(extension: string): TmpFile {
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

export async function generateTmpFile(content: string, extension: string) {
  const dir = tmpdir();
  const fileName = randomUUID();
  const filepath = join(dir, `${fileName}.${extension}`);

  await writeFile(filepath, content, 'utf-8');

  return filepath;
}
