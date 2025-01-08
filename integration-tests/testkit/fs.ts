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

/**
 * Writes a temporary file with the given content and returns the path to the file.
 */
export const writeTmpFile = async (params: {
  /**
   * Content of the file to be created.
   * If an object is provided, it will be converted to a JSON string with 2 spaces of indentation.
   */
  content: string | object;
  /**
   * Extension of the file to be created.
   * Leading dot will be ignored.
   *
   * @defaultValue 'txt' unless the content is an object in which case it will be 'json'.
   */
  extension?: string;
}) => {
  const extension = params.extension ?? 'txt';
  const content = typeof params.content === 'object' ? JSON.stringify(params.content,null,2) : params.content;
  const dirPath = tmpdir();
  const fileName = randomUUID();
  const filePath = join(dirPath, `${fileName}.${extension.replace(/^\./, '')}`);

  await writeFile(filePath, content, 'utf-8');

  return filePath;
};
