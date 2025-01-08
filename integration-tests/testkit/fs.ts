import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface TmpFileController {
  name: string;
  extension: string;
  path: string;
  read(): Promise<string>;
}

export const createTmpFileController = ({ extension }: {
  /**
   * Extension of the file to be created.
   */
  extension: string; }): TmpFileController => {
  const dirPath = tmpdir();
  const fileName = randomUUID();
  const filePath = join(dirPath, `${fileName}.${extension}`);

  return {
    name: fileName,
    extension: extension,
    path: filePath,
    read() {
      return readFile(filePath, 'utf-8');
    },
  };
};

export const generateTmpFile = async (content: string, extension: string) => {
  const dirPath = tmpdir();
  const fileName = randomUUID();
  const filePath = join(dirPath, `${fileName}.${extension}`);

  await writeFile(filePath, content, 'utf-8');

  return filePath;
};
