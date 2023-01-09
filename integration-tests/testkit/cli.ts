import 'jest-expect-message';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execaCommand } from '@esm2cjs/execa';
import { fetchLatestSchema, fetchLatestValidSchema } from './flow';
import { getServiceHost } from './utils';

const binPath = resolve(__dirname, '../../packages/libraries/cli/bin/run');
const cliDir = resolve(__dirname, '../../packages/libraries/cli');

async function generateTmpFile(content: string, extension: string) {
  const dir = tmpdir();
  const fileName = randomUUID();
  const filepath = join(dir, `${fileName}.${extension}`);

  await writeFile(filepath, content, 'utf-8');

  return filepath;
}

export async function createCLI(token: string) {
  let publishCount = 0;

  async function publish({
    sdl,
    serviceName,
    serviceUrl,
    metadata,
    expect: expectedStatus,
    force,
    acceptBreakingChanges,
  }: {
    sdl: string;
    commit?: string;
    serviceName?: string;
    serviceUrl?: string;
    metadata?: string;
    force?: boolean;
    acceptBreakingChanges?: boolean;
    expect: 'latest' | 'latest-composable' | 'ignored' | 'rejected';
  }) {
    const publishName = ` #${++publishCount}`;
    const commit = randomUUID();

    const cmd = schemaPublish([
      '--token',
      token,
      '--author',
      'Kamil',
      '--commit',
      commit,
      ...(serviceName ? ['--service', serviceName] : []),
      ...(serviceUrl ? ['--url', serviceUrl] : []),
      ...(metadata ? ['--metadata', metadata] : []),
      ...(force ? ['--force'] : []),
      ...(acceptBreakingChanges ? ['--experimental_acceptBreakingChanges'] : []),
      await generateTmpFile(sdl, 'graphql'),
    ]);

    const expectedCommit = expect.objectContaining({
      commit,
    });

    if (expectedStatus === 'rejected') {
      await expect(cmd).rejects.toThrow();
      const latestSchemaResult = await fetchLatestSchema(token).then(r =>
        r.expectNoGraphQLErrors(),
      );
      const latestSchemaCommit = latestSchemaResult.latestVersion?.commit;

      expect(
        latestSchemaCommit,
        `${publishName} was expected to be rejected but was published`,
      ).not.toEqual(expectedCommit);

      return;
    }

    // throw if the command fails
    try {
      await cmd;
    } catch (error) {
      throw new Error(`${publishName} failed: ${String(error)}`);
    }

    const latestSchemaResult = await fetchLatestSchema(token).then(r => r.expectNoGraphQLErrors());
    const latestSchemaCommit = latestSchemaResult.latestVersion?.commit;

    if (expectedStatus === 'ignored') {
      // Check if the schema was ignored
      expect(
        latestSchemaCommit,
        `${publishName} was expected to be ignored but it was published`,
      ).not.toEqual(expectedCommit);
      return;
    }
    // Check if the schema was published
    expect(latestSchemaCommit, `${publishName} was expected to be published`).toEqual(
      expectedCommit,
    );

    const latestComposableSchemaResult = await fetchLatestValidSchema(token).then(r =>
      r.expectNoGraphQLErrors(),
    );

    const latestComposableSchemaCommit = latestComposableSchemaResult.latestValidVersion?.commit;

    // Check if the schema was published as composable or non-composable
    if (expectedStatus === 'latest') {
      // schema is not available to the gateway
      expect(
        latestComposableSchemaCommit,
        `${publishName} was expected to be published but not as composable`,
      ).not.toEqual(expectedCommit);
    } else {
      // schema is available to the gateway
      expect(
        latestComposableSchemaCommit,
        `${publishName} was expected to be published as composable`,
      ).toEqual(expectedCommit);
    }
  }

  async function check({
    sdl,
    serviceName,
    expect: expectedStatus,
  }: {
    sdl: string;
    serviceName?: string;
    expect: 'approved' | 'rejected';
  }) {
    const cmd = schemaCheck([
      '--token',
      token,
      ...(serviceName ? ['--service', serviceName] : []),
      await generateTmpFile(sdl, 'graphql'),
    ]);

    if (expectedStatus === 'rejected') {
      await expect(cmd).rejects.toThrow();
      return cmd.catch(reason => Promise.resolve(reason.message));
    }
    return cmd;
  }

  return {
    publish,
    check,
  };
}

async function exec(cmd: string) {
  const outout = await execaCommand(`${binPath} ${cmd}`, {
    shell: true,
    env: {
      OCLIF_CLI_CUSTOM_PATH: cliDir,
    },
  });

  if (outout.failed) {
    throw new Error(outout.stderr);
  }

  return outout.stdout;
}

export async function schemaPublish(args: string[]) {
  const registryAddress = await getServiceHost('server', 8082);
  return await exec(
    ['schema:publish', `--registry`, `http://${registryAddress}/graphql`, ...args].join(' '),
  );
}

export async function schemaCheck(args: string[]) {
  const registryAddress = await getServiceHost('server', 8082);

  return await exec(
    ['schema:check', `--registry`, `http://${registryAddress}/graphql`, ...args].join(' '),
  );
}
