import { randomUUID } from 'node:crypto';
import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getSchemaCheckDetails } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { schemaCheck, schemaPublish } from '../../testkit/cli';
import { initSeed } from '../../testkit/seed';

test('schema:check parses GitHub merge queue commit information', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { inviteAndJoinMember, createProject } = await createOrg();
  await inviteAndJoinMember();
  const { createTargetAccessToken, target } = await createProject(ProjectType.Federation);
  const { secret, latestSchemaCheck } = await createTargetAccessToken({});

  await schemaPublish([
    '--registry.accessToken',
    secret,
    '--author',
    'HiveBot',
    '--commit',
    'initial-commit-sha',
    '--service',
    'test',
    'fixtures/init-schema.graphql',
  ]);

  const eventPath = join(tmpdir(), `${randomUUID()}.json`);
  await writeFile(
    eventPath,
    JSON.stringify({
      merge_group: {
        base_ref: 'refs/heads/main',
        base_sha: 'base-commit-sha',
        head_ref: 'refs/heads/gh-readonly-queue/main/pr-123-deadbeef',
        head_sha: 'head-commit-sha',
      },
    }),
  );

  try {
    await expect(
      schemaCheck(
        [
          '--registry.accessToken',
          secret,
          '--author',
          'HiveBot',
          '--service',
          'test',
          '--contextId',
          'graphql-hive/console#123',
          '--baseline',
          'fixtures/init-schema.graphql',
          'fixtures/init-schema.graphql',
        ],
        {
          GITHUB_ACTIONS: 'true',
          GITHUB_EVENT_NAME: 'merge_group',
          GITHUB_EVENT_PATH: eventPath,
          GITHUB_REPOSITORY: 'graphql-hive/console',
        },
      ),
    ).resolves.toContain('No changes');

    const checkId = await latestSchemaCheck();
    const result = await getSchemaCheckDetails({ byId: target.id }, checkId!, ownerToken).then(
      response => response.expectNoGraphQLErrors(),
    );

    expect(result.target?.schemaCheck).toMatchObject({
      contextId: 'graphql-hive/console#123',
      baseline: {
        meta: {
          commit: 'base-commit-sha',
        },
      },
      meta: {
        author: 'HiveBot',
        commit: 'head-commit-sha',
      },
    });
  } finally {
    await rm(eventPath);
  }
});
