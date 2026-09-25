import { ProjectType } from 'testkit/gql/graphql';
import { schemaPublish, schemaPush } from '../../testkit/cli';
import { initSeed } from '../../testkit/seed';

test('schema:publish requires a file or revision', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Single);
  const { secret } = await createTargetAccessToken({ mode: 'readWrite' });
  const publish = schemaPublish([
    '--registry.accessToken',
    secret,
    '--target',
    target.id,
    '--author',
    'HiveCLI',
    '--commit',
    'missing-source',
  ]);

  await expect(publish).rejects.toThrow('Missing 1 required argument:');
  await expect(publish).rejects.toThrow('FILE');
});

describe.each([
  {
    projectType: ProjectType.Single,
    revision: 'monolith-v1',
    serviceArgs: [] as string[],
    publishArgs: [] as string[],
  },
  {
    projectType: ProjectType.Federation,
    revision: 'federation-v1',
    serviceArgs: ['--service', 'products'],
    publishArgs: ['--service', 'products', '--url', 'https://products.example.com/graphql'],
  },
])(
  'schema revisions for $projectType projects',
  ({ projectType, revision, serviceArgs, publishArgs }) => {
    test.concurrent('pushes and publishes a schema revision', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { target, createTargetAccessToken, fetchVersions } = await createProject(projectType);
      const { secret } = await createTargetAccessToken({ mode: 'readWrite' });

      await expect(
        schemaPush([
          '--registry.accessToken',
          secret,
          '--target',
          target.id,
          '--revision',
          revision,
          ...serviceArgs,
          'fixtures/init-schema.graphql',
        ]),
      ).resolves.toContain(`Revision: ${revision}`);

      await expect(
        schemaPublish([
          '--registry.accessToken',
          secret,
          '--target',
          target.id,
          '--author',
          'HiveCLI',
          '--commit',
          revision,
          '--revision',
          revision,
          ...publishArgs,
        ]),
      ).resolves.toContain('Published initial schema.');

      const secondRevision = `${revision}-2`;
      await schemaPush([
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--revision',
        secondRevision,
        ...serviceArgs,
        'fixtures/init-schema.graphql',
      ]);

      await expect(
        schemaPublish([
          '--registry.accessToken',
          secret,
          '--target',
          target.id,
          '--author',
          'HiveCLI',
          '--commit',
          secondRevision,
          '--revision',
          secondRevision,
          ...publishArgs,
        ]),
      ).resolves.toContain('Schema published');

      const versions = await fetchVersions(3);
      expect(versions).toHaveLength(2);
      expect(versions[0].id).not.toBe(versions[1].id);
    });

    test.concurrent('rejects unknown and conflicting revisions', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { target, createTargetAccessToken } = await createProject(projectType);
      const { secret } = await createTargetAccessToken({ mode: 'readWrite' });
      const identifier = serviceArgs.length ? `products@${revision}` : revision;

      const missingPublish = schemaPublish([
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--author',
        'HiveCLI',
        '--commit',
        'missing',
        '--revision',
        'missing',
        ...publishArgs,
      ]);
      await expect(missingPublish).rejects.toThrow('Schema publish failed.');
      await expect(missingPublish).rejects.toThrow('Schema revision');
      await expect(missingPublish).rejects.toThrow('missing');
      await expect(missingPublish).rejects.toThrow('was not found.');

      await schemaPush([
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--revision',
        revision,
        ...serviceArgs,
        'fixtures/init-schema.graphql',
      ]);

      const conflictingPush = schemaPush([
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--revision',
        revision,
        ...serviceArgs,
        'fixtures/nonbreaking-schema.graphql',
      ]);
      await expect(conflictingPush).rejects.toThrow(`Revision '${identifier}' already exists`);
      await expect(conflictingPush).rejects.toThrow('with a different');
      await expect(conflictingPush).rejects.toThrow('schema.');
    });

    test.concurrent('pushing the same revision again is skipped', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { target, createTargetAccessToken } = await createProject(projectType);
      const { secret } = await createTargetAccessToken({ mode: 'readWrite' });
      const pushArgs = [
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--revision',
        revision,
        ...serviceArgs,
        'fixtures/init-schema.graphql',
      ];

      await expect(schemaPush(pushArgs)).resolves.toContain('Schema revision pushed.');

      const repeatedPush = await schemaPush(pushArgs);
      expect(repeatedPush).not.toContain('Schema revision pushed.');
      expect(repeatedPush).toContain(`Revision: ${revision}`);
    });
  },
);

test('schema:publish --revision without --service reports the missing service', async ({
  expect,
}) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
  const { secret } = await createTargetAccessToken({ mode: 'readWrite' });

  await schemaPush([
    '--registry.accessToken',
    secret,
    '--target',
    target.id,
    '--revision',
    'v1',
    '--service',
    'products',
    'fixtures/init-schema.graphql',
  ]);

  const publish = schemaPublish([
    '--registry.accessToken',
    secret,
    '--target',
    target.id,
    '--author',
    'HiveCLI',
    '--commit',
    'v1',
    '--revision',
    'v1',
  ]);
  await expect(publish).rejects.toThrow('Missing service name');
  await expect(publish).rejects.toThrow('[302]');
});

test('schema:push rejects an invalid service name', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
  const { secret } = await createTargetAccessToken({ mode: 'readWrite' });

  const push = schemaPush([
    '--registry.accessToken',
    secret,
    '--target',
    target.id,
    '--revision',
    'v1',
    '--service',
    '1-invalid',
    'fixtures/init-schema.graphql',
  ]);
  await expect(push).rejects.toThrow('Revision rejected by the server: Invalid service name.');
  await expect(push).rejects.toThrow('[115]');
});
