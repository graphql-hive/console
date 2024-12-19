import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execaCommand } from '@esm2cjs/execa';
import { HiveCLI } from '@graphql-hive/cli';
import { Static } from '@sinclair/typebox';
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

async function exec(cmd: string) {
  const outout = await execaCommand(`${binPath} ${cmd}`, {
    shell: true,
    env: {
      OCLIF_CLI_CUSTOM_PATH: cliDir,
      NODE_OPTIONS: '--no-deprecation',
    },
  });

  if (outout.failed) {
    throw new Error(outout.stderr);
  }

  return outout.stdout;
}

export const hiveCLI = HiveCLI.create({
  execute: exec,
  middleware: {
    args: async args => {
      const registryAddress = await getServiceHost('server', 8082);
      return {
        'registry.endpoint': `http://${registryAddress}/graphql`,
        ...args,
      };
    },
  },
});

export type CLI = ReturnType<typeof createCLI>;

export function createCLI(tokens: { readwrite: string; readonly: string }) {
  let publishCount = 0;

  async function publish({
    sdl,
    serviceName,
    serviceUrl,
    metadata,
    expect: expectedStatus,
    legacy_force,
    legacy_acceptBreakingChanges,
    json,
  }: {
    json?: boolean;
    sdl: string;
    commit?: string;
    serviceName?: string;
    serviceUrl?: string;
    metadata?: Record<string, any>;
    legacy_force?: boolean;
    legacy_acceptBreakingChanges?: boolean;
    expect: 'latest' | 'latest-composable' | 'ignored' | 'rejected';
  }): Promise<string> {
    const publishName = ` #${++publishCount}`;
    const commit = randomUUID();

    const cmd = hiveCLI.schemaPublish({
      $positional: [await generateTmpFile(sdl, 'graphql')],
      json,
      'registry.accessToken': tokens.readwrite,
      author: 'Kamil',
      commit,
      service: serviceName,
      url: serviceUrl,
      metadata: metadata ? await generateTmpFile(JSON.stringify(metadata), 'json') : undefined,
      force: legacy_force,
      experimental_acceptBreakingChanges: legacy_acceptBreakingChanges,
    });

    const expectedCommit = expect.objectContaining({
      commit,
    });

    if (expectedStatus === 'rejected') {
      await expect(cmd).rejects.toThrow();
      const latestSchemaResult = await fetchLatestSchema(tokens.readonly).then(r =>
        r.expectNoGraphQLErrors(),
      );
      const latestSchemaCommit = latestSchemaResult.latestVersion?.log;

      expect(
        latestSchemaCommit,
        `${publishName} was expected to be rejected but was published`,
      ).not.toEqual(expectedCommit);

      return '';
    }

    // throw if the command fails
    await cmd;

    const latestSchemaResult = await fetchLatestSchema(tokens.readonly).then(r =>
      r.expectNoGraphQLErrors(),
    );
    const latestSchemaCommit = latestSchemaResult.latestVersion?.log;

    if (expectedStatus === 'ignored') {
      // Check if the schema was ignored
      expect(
        latestSchemaCommit,
        `${publishName} was expected to be ignored but it was published`,
      ).not.toEqual(expectedCommit);
      return '';
    }
    // Check if the schema was published
    expect(latestSchemaCommit, `${publishName} was expected to be published`).toEqual(
      expectedCommit,
    );

    const latestComposableSchemaResult = await fetchLatestValidSchema(tokens.readonly).then(r =>
      r.expectNoGraphQLErrors(),
    );

    const latestComposableSchemaCommit = latestComposableSchemaResult.latestValidVersion?.log;

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

    return await cmd;
  }

  async function check({
    sdl,
    serviceName,
    expect: expectedStatus,
  }: {
    sdl: string;
    serviceName?: string;
    expect: 'approved' | 'rejected';
  }): Promise<string> {
    const cmd = hiveCLI.schemaCheck({
      'registry.accessToken': tokens.readonly,
      service: serviceName,
      $positional: [await generateTmpFile(sdl, 'graphql')],
    });

    if (expectedStatus === 'rejected') {
      await expect(cmd).rejects.toThrow();
      return cmd.catch(reason => Promise.resolve(reason.message));
    }
    return cmd;
  }

  async function deleteCommand({
    serviceName,
    expect: expectedStatus,
  }: {
    serviceName?: string;
    expect: 'latest' | 'latest-composable' | 'rejected';
  }): Promise<string> {
    const cmd = hiveCLI.schemaDelete({
      'registry.accessToken': tokens.readwrite,
      // @ts-expect-error fixme: confirm is a boolean flag so why is a string being passed here?
      confirm: serviceName ?? '',
    });

    const before = {
      latest: await fetchLatestSchema(tokens.readonly).then(r => r.expectNoGraphQLErrors()),
      latestValid: await fetchLatestValidSchema(tokens.readonly).then(r =>
        r.expectNoGraphQLErrors(),
      ),
    };

    if (expectedStatus === 'rejected') {
      await expect(cmd).rejects.toThrow();

      const after = {
        latest: await fetchLatestSchema(tokens.readonly).then(r => r.expectNoGraphQLErrors()),
        latestValid: await fetchLatestValidSchema(tokens.readonly).then(r =>
          r.expectNoGraphQLErrors(),
        ),
      };

      expect(after.latest.latestVersion?.log).toEqual(before.latest.latestVersion?.log);
      expect(after.latestValid.latestValidVersion?.id).toEqual(
        before.latestValid.latestValidVersion?.id,
      );

      return cmd.catch(reason => Promise.resolve(reason.message));
    }
    await cmd;

    const after = {
      latest: await fetchLatestSchema(tokens.readonly).then(r => r.expectNoGraphQLErrors()),
      latestValid: await fetchLatestValidSchema(tokens.readonly).then(r =>
        r.expectNoGraphQLErrors(),
      ),
    };

    if (expectedStatus === 'latest-composable') {
      expect(after.latest.latestVersion?.log).not.toEqual(before.latest.latestVersion?.log);
      expect(after.latestValid.latestValidVersion?.log).not.toEqual(
        before.latestValid.latestValidVersion?.log,
      );
    } else {
      expect(after.latest.latestVersion?.log).not.toEqual(before.latest.latestVersion?.log);
      expect(after.latestValid.latestValidVersion?.id).toEqual(
        before.latestValid.latestValidVersion?.id,
      );
    }

    return cmd;
  }

  async function devCommand(args: Static<typeof HiveCLI.Commands.Dev.parameters.named>) {
    const schema = await Promise.all(
      args.schema?.map(async schema => generateTmpFile(schema, 'graphql')) ?? [],
    );
    const accessToken = args.remote ? tokens.readonly : undefined;

    return hiveCLI.dev({
      ...args,
      'registry.accessToken': accessToken,
      schema,
    });
  }

  return {
    publish,
    check,
    delete: deleteCommand,
    dev: devCommand,
  };
}
