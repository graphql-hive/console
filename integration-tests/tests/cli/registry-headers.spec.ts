import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execa } from '@esm2cjs/execa';

const binPath = resolve(__dirname, '../../../packages/libraries/cli/bin/run');
const cliDir = resolve(__dirname, '../../../packages/libraries/cli');

test('sends configured headers to the registry endpoint', async () => {
  const headerValue = 'custom-header-value';
  let receivedHeader: string | undefined;
  const server = createServer((request, response) => {
    receivedHeader = request.headers['x-custom-registry-header'] as string | undefined;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        data: {
          whoAmI: {
            title: 'Test token',
            resolvedPermissions: [],
          },
        },
      }),
    );
  });
  const configDir = await mkdtemp(resolve(tmpdir(), 'hive-cli-registry-headers-'));
  const configPath = resolve(configDir, 'hive.json');

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address() as AddressInfo;
    await writeFile(
      configPath,
      JSON.stringify({
        registry: {
          endpoint: `http://127.0.0.1:${port}/graphql`,
          accessToken: 'test-token',
          headers: {
            'x-custom-registry-header': headerValue,
          },
        },
      }),
    );

    const result = await execa(binPath, ['whoami'], {
      env: {
        HIVE_CONFIG: configPath,
        OCLIF_CLI_CUSTOM_PATH: cliDir,
        NODE_OPTIONS: '--no-deprecation',
      },
    });

    expect(result.stdout).toContain('Test token');
    expect(receivedHeader).toBe(headerValue);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
    await rm(configDir, { recursive: true, force: true });
  }
});

test('sends registry headers provided by CLI flags', async () => {
  const configuredHeaderValue = 'configured-header-value';
  const flagHeaderValue = 'flag-header=value';
  let receivedHeader: string | undefined;
  const server = createServer((request, response) => {
    receivedHeader = request.headers['x-custom-registry-header'] as string | undefined;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        data: {
          whoAmI: {
            title: 'Test token',
            resolvedPermissions: [],
          },
        },
      }),
    );
  });
  const configDir = await mkdtemp(resolve(tmpdir(), 'hive-cli-registry-headers-'));
  const configPath = resolve(configDir, 'hive.json');

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  try {
    const { port } = server.address() as AddressInfo;
    await writeFile(
      configPath,
      JSON.stringify({
        registry: {
          endpoint: `http://127.0.0.1:${port}/graphql`,
          accessToken: 'test-token',
          headers: {
            'x-custom-registry-header': configuredHeaderValue,
          },
        },
      }),
    );

    const result = await execa(
      binPath,
      ['whoami', '--registry.header', `x-custom-registry-header=${flagHeaderValue}`],
      {
        env: {
          HIVE_CONFIG: configPath,
          OCLIF_CLI_CUSTOM_PATH: cliDir,
          NODE_OPTIONS: '--no-deprecation',
        },
      },
    );

    expect(result.stdout).toContain('Test token');
    expect(receivedHeader).toBe(flagHeaderValue);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
    await rm(configDir, { recursive: true, force: true });
  }
});
