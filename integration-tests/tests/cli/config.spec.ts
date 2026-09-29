import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execa } from '@esm2cjs/execa';

const binPath = resolve(__dirname, '../../../packages/libraries/cli/bin/run');
const cliDir = resolve(__dirname, '../../../packages/libraries/cli');

test('an invalid hive.json is an invalid configuration error', async () => {
  const dir = await mkdtemp(resolve(tmpdir(), 'hive-cli-config-'));

  try {
    await writeFile(resolve(dir, 'hive.json'), '{ "registry": { "accessToken": "token", } }');
    await writeFile(resolve(dir, 'schema.graphql'), 'type Query { hello: String }');

    const result = await execa(binPath, ['schema:check', 'schema.graphql'], {
      reject: false,
      cwd: dir,
      // Without HIVE_REGISTRY, the registry endpoint is read from hive.json.
      extendEnv: false,
      env: {
        PATH: process.env.PATH,
        HIVE_TOKEN: 'test-token',
        HIVE_NO_ERROR_TIP: '1',
        OCLIF_CLI_CUSTOM_PATH: cliDir,
        OCLIF_COLUMNS: '1000',
        NODE_OPTIONS: '--no-deprecation',
      },
    });

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain('is invalid: Invalid JSON.');
    expect(result.stderr).toContain('[100]');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
