import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  InvalidSDLError,
  SchemaFileEmptyError,
  SchemaFileNotFoundError,
} from '../src/helpers/errors';
import { loadSchemaSdl } from '../src/helpers/schema';

const logger = { info: () => {}, error: () => {}, debug: () => {} };

function writeSchema(content: string) {
  const filepath = join(mkdtempSync(join(tmpdir(), 'hive-cli-schema-')), 'schema.graphql');
  writeFileSync(filepath, content);
  return filepath;
}

describe('loadSchemaSdl', () => {
  test('loads a schema file', async () => {
    const filepath = writeSchema('type Query { hello: String }');
    await expect(loadSchemaSdl(filepath, { logger })).resolves.toContain('hello: String');
  });

  test('a missing file is a schema not found error', async () => {
    const filepath = join(tmpdir(), 'hive-cli-does-not-exist', 'schema.graphql');
    const error = await loadSchemaSdl(filepath, { logger }).catch(error => error);
    expect(error).toBeInstanceOf(SchemaFileNotFoundError);
    expect(error.message).toContain('The file does not exist.');
  });

  test.each(['', '# only a comment\n'])('an empty file is an empty schema error', async content => {
    const filepath = writeSchema(content);
    await expect(loadSchemaSdl(filepath, { logger })).rejects.toBeInstanceOf(SchemaFileEmptyError);
  });

  test('invalid SDL is an invalid SDL error', async () => {
    const filepath = writeSchema('type Query {');
    await expect(loadSchemaSdl(filepath, { logger })).rejects.toBeInstanceOf(InvalidSDLError);
  });
});
