import { ProjectType } from 'testkit/gql/graphql';
import { schemaPublish, schemaPush } from '../../testkit/cli';
import { initSeed } from '../../testkit/seed';

test('schema:publish requires a file or version', async ({ expect }) => {
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
    version: 'monolith-v1',
    serviceArgs: [] as string[],
    publishArgs: [] as string[],
  },
  {
    projectType: ProjectType.Federation,
    version: 'federation-v1',
    serviceArgs: ['--service', 'products'],
    publishArgs: ['--service', 'products', '--url', 'https://products.example.com/graphql'],
  },
])(
  'schema revisions for $projectType projects',
  ({ projectType, version, serviceArgs, publishArgs }) => {
    test.concurrent('pushes and publishes a schema version', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { target, createTargetAccessToken } = await createProject(projectType);
      const { secret } = await createTargetAccessToken({ mode: 'readWrite' });

      await expect(
        schemaPush([
          '--registry.accessToken',
          secret,
          '--target',
          target.id,
          '--version',
          version,
          ...serviceArgs,
          'fixtures/init-schema.graphql',
        ]),
      ).resolves.toContain(`Version: ${version}`);

      await expect(
        schemaPublish([
          '--registry.accessToken',
          secret,
          '--target',
          target.id,
          '--author',
          'HiveCLI',
          '--commit',
          version,
          '--version',
          version,
          ...publishArgs,
        ]),
      ).resolves.toContain('Published initial schema.');
    });

    test.concurrent('rejects unknown and conflicting schema versions', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { target, createTargetAccessToken } = await createProject(projectType);
      const { secret } = await createTargetAccessToken({ mode: 'readWrite' });
      const identifier = serviceArgs.length ? `products@${version}` : version;

      const missingPublish = schemaPublish([
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--author',
        'HiveCLI',
        '--commit',
        'missing',
        '--version',
        'missing',
        ...publishArgs,
      ]);
      await expect(missingPublish).rejects.toThrow('Schema publish failed.');
      await expect(missingPublish).rejects.toThrow('Schema version');
      await expect(missingPublish).rejects.toThrow('missing');
      await expect(missingPublish).rejects.toThrow('was not found.');

      await schemaPush([
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--version',
        version,
        ...serviceArgs,
        'fixtures/init-schema.graphql',
      ]);

      const conflictingPush = schemaPush([
        '--registry.accessToken',
        secret,
        '--target',
        target.id,
        '--version',
        version,
        ...serviceArgs,
        'fixtures/nonbreaking-schema.graphql',
      ]);
      await expect(conflictingPush).rejects.toThrow(`Version '${identifier}' already exists`);
      await expect(conflictingPush).rejects.toThrow('with a different');
      await expect(conflictingPush).rejects.toThrow('schema.');
    });
  },
);
