/* eslint-disable no-process-env */
import { createHash } from 'node:crypto';
import { ProjectType } from 'testkit/gql/graphql';
import { createCLI, schemaCheck, schemaPublish } from '../../testkit/cli';
import { cliOutputSnapshotSerializer } from '../../testkit/cli-snapshot-serializer';
import { initSeed } from '../../testkit/seed';
import { test } from '../../testkit/test';
import { SnapshotSerializers } from './__snapshot_serializers__/__';

expect.addSnapshotSerializer(SnapshotSerializers.cliOutput);

expect.addSnapshotSerializer(cliOutputSnapshotSerializer);

describe.each`
  projectType               | model       | json
  ${ProjectType.Single}     | ${'modern'} | ${false}
  ${ProjectType.Stitching}  | ${'modern'} | ${false}
  ${ProjectType.Federation} | ${'modern'} | ${false}
  ${ProjectType.Single}     | ${'legacy'} | ${false}
  ${ProjectType.Stitching}  | ${'legacy'} | ${false}
  ${ProjectType.Federation} | ${'legacy'} | ${false}
  ${ProjectType.Single}     | ${'modern'} | ${true}
  ${ProjectType.Stitching}  | ${'modern'} | ${true}
  ${ProjectType.Federation} | ${'modern'} | ${true}
  ${ProjectType.Single}     | ${'legacy'} | ${true}
  ${ProjectType.Stitching}  | ${'legacy'} | ${true}
  ${ProjectType.Federation} | ${'legacy'} | ${true}
`('projectType: $projectType | model: $model | json: $json', ({ projectType, model, json }) => {
  const serviceNameArgs = projectType === ProjectType.Single ? [] : ['--service', 'test'];
  const serviceUrlArgs =
    projectType === ProjectType.Single ? [] : ['--url', 'http://localhost:4000'];
  const serviceName = projectType === ProjectType.Single ? undefined : 'test';
  const serviceUrl = projectType === ProjectType.Single ? undefined : 'http://localhost:4000';

  test.concurrent(
    'can publish a schema with breaking, warning and safe changes',
    async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { inviteAndJoinMember, createProject } = await createOrg();
      await inviteAndJoinMember();
      const { createTargetAccessToken } = await createProject(projectType, {
        useLegacyRegistryModels: model === 'legacy',
      });
      const { secret } = await createTargetAccessToken({});

      await expect(
        schemaPublish([
          ...(json ? ['--json'] : []),
          '--registry.accessToken',
          secret,
          '--author',
          'Kamil',
          '--commit',
          'abc123',
          ...serviceNameArgs,
          ...serviceUrlArgs,
          'fixtures/init-schema-detailed.graphql',
        ]),
      ).resolves.toMatchSnapshot('schemaPublish');

      await expect(
        schemaCheck([
          ...(json ? ['--json'] : []),
          ...serviceNameArgs,
          '--registry.accessToken',
          secret,
          'fixtures/breaking-schema-detailed.graphql',
        ]),
      ).rejects.toMatchSnapshot('schemaCheck');
    },
  );

  test.concurrent(
    'can publish and check a schema with target:registry:read access',
    async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { inviteAndJoinMember, createProject } = await createOrg();
      await inviteAndJoinMember();
      const { createTargetAccessToken } = await createProject(projectType, {
        useLegacyRegistryModels: model === 'legacy',
      });
      const { secret } = await createTargetAccessToken({});

      await expect(
        schemaPublish([
          ...(json ? ['--json'] : []),
          '--registry.accessToken',
          secret,
          '--author',
          'Kamil',
          '--commit',
          'abc123',
          ...serviceNameArgs,
          ...serviceUrlArgs,
          'fixtures/init-schema.graphql',
        ]),
      ).resolves.toMatchSnapshot('schemaPublish');

      await expect(
        schemaCheck([
          ...(json ? ['--json'] : []),
          '--service',
          'test',
          '--registry.accessToken',
          secret,
          'fixtures/nonbreaking-schema.graphql',
        ]),
      ).resolves.toMatchSnapshot('schemaCheck (non-breaking)');

      await expect(
        schemaCheck([
          ...(json ? ['--json'] : []),
          ...serviceNameArgs,
          '--registry.accessToken',
          secret,
          'fixtures/breaking-schema.graphql',
        ]),
      ).rejects.toMatchSnapshot('schemaCheck (breaking)');
    },
  );

  test.concurrent(
    'publishing invalid schema SDL provides meaningful feedback for the user.',
    async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { inviteAndJoinMember, createProject } = await createOrg();
      await inviteAndJoinMember();
      const { createTargetAccessToken } = await createProject(projectType, {
        useLegacyRegistryModels: model === 'legacy',
      });
      const { secret } = await createTargetAccessToken({});

      await expect(
        schemaPublish([
          ...(json ? ['--json'] : []),
          '--registry.accessToken',
          secret,
          '--author',
          'Kamil',
          '--commit',
          'abc123',
          ...serviceNameArgs,
          ...serviceUrlArgs,
          'fixtures/init-invalid-schema.graphql',
        ]),
      ).rejects.toMatchSnapshot('schemaPublish');
    },
  );

  test.concurrent('schema:publish should print a link to the website', async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { organization, inviteAndJoinMember, createProject } = await createOrg();
    await inviteAndJoinMember();
    const { project, target, createTargetAccessToken } = await createProject(projectType, {
      useLegacyRegistryModels: model === 'legacy',
    });
    const { secret } = await createTargetAccessToken({});

    await expect(
      schemaPublish([
        ...(json ? ['--json'] : []),
        ...serviceNameArgs,
        ...serviceUrlArgs,
        '--registry.accessToken',
        secret,
        'fixtures/init-schema.graphql',
      ]),
    ).resolves.toMatch(
      `${process.env.HIVE_APP_BASE_URL}/${organization.slug}/${project.slug}/${target.slug}`,
    );

    await expect(
      schemaPublish([
        ...(json ? ['--json'] : []),
        ...serviceNameArgs,
        ...serviceUrlArgs,
        '--registry.accessToken',
        secret,
        'fixtures/nonbreaking-schema.graphql',
      ]),
    ).resolves.toMatch(
      `${process.env.HIVE_APP_BASE_URL}/${organization.slug}/${project.slug}/${target.slug}/history/`,
    );
  });

  test.concurrent('schema:check should notify user when registry is empty', async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { inviteAndJoinMember, createProject } = await createOrg();
    await inviteAndJoinMember();
    const { createTargetAccessToken } = await createProject(projectType, {
      useLegacyRegistryModels: model === 'legacy',
    });
    const { secret } = await createTargetAccessToken({});

    await expect(
      schemaCheck([
        ...(json ? ['--json'] : []),
        '--registry.accessToken',
        secret,
        ...serviceNameArgs,
        'fixtures/init-schema.graphql',
      ]),
    ).resolves.toMatchSnapshot('schemaCheck');
  });

  test.concurrent('schema:check should throw on corrupted schema', async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { inviteAndJoinMember, createProject } = await createOrg();
    await inviteAndJoinMember();
    const { createTargetAccessToken } = await createProject(projectType, {
      useLegacyRegistryModels: model === 'legacy',
    });
    const { secret } = await createTargetAccessToken({});

    await expect(
      schemaCheck([
        ...(json ? ['--json'] : []),
        ...serviceNameArgs,
        '--registry.accessToken',
        secret,
        'fixtures/missing-type.graphql',
      ]),
    ).rejects.toMatchSnapshot('schemaCheck');
  });

  test.concurrent(
    'schema:publish should see Invalid Token error when token is invalid',
    async ({ expect }) => {
      const invalidToken = createHash('md5').update('nope').digest('hex').substring(0, 31);
      await expect(
        schemaPublish([
          ...(json ? ['--json'] : []),
          ...serviceNameArgs,
          ...serviceUrlArgs,
          '--registry.accessToken',
          invalidToken,
          'fixtures/init-schema.graphql',
        ]),
      ).rejects.toMatchSnapshot('schemaPublish');
    },
  );

  test
    .skipIf(projectType === ProjectType.Single)
    .concurrent(
      'can update the service url and show it in comparison query',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { inviteAndJoinMember, createProject } = await createOrg();
        await inviteAndJoinMember();
        const { createTargetAccessToken, compareToPreviousVersion, fetchVersions } =
          await createProject(projectType, {
            useLegacyRegistryModels: model === 'legacy',
          });
        const { secret } = await createTargetAccessToken({});
        const cli = createCLI({
          readonly: secret,
          readwrite: secret,
        });

        const sdl = /* GraphQL */ `
          type Query {
            users: [User!]
          }

          type User {
            id: ID!
            name: String!
            email: String!
          }
        `;

        await expect(
          cli.publish({
            sdl,
            commit: 'push1',
            serviceName,
            serviceUrl,
            expect: 'latest-composable',
          }),
        ).resolves.toMatchSnapshot('schemaPublish (initial)');

        const newServiceUrl = serviceUrl + '/new';
        await expect(
          cli.publish({
            sdl,
            commit: 'push2',
            serviceName,
            serviceUrl: newServiceUrl,
            expect: 'latest-composable',
          }),
        ).resolves.toMatchSnapshot('schemaPublish (new)');

        const versions = await fetchVersions(3);
        expect(versions).toHaveLength(2);

        const versionWithNewServiceUrl = versions[0];

        expect(await compareToPreviousVersion(versionWithNewServiceUrl.id)).toEqual(
          expect.objectContaining({
            target: expect.objectContaining({
              schemaVersion: expect.objectContaining({
                safeSchemaChanges: expect.objectContaining({
                  nodes: expect.arrayContaining([
                    expect.objectContaining({
                      criticality: 'Dangerous',
                      message: `[${serviceName}] New service url: '${newServiceUrl}' (previously: '${serviceUrl}')`,
                    }),
                  ]),
                }),
              }),
            }),
          }),
        );
      },
    );

  test.concurrent(
    'schema:fetch can fetch a schema with target:registry:read access',
    async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { inviteAndJoinMember, createProject } = await createOrg();
      await inviteAndJoinMember();
      const { createTargetAccessToken } = await createProject(projectType, {
        useLegacyRegistryModels: model === 'legacy',
      });
      const { secret, latestSchema } = await createTargetAccessToken({});

      const cli = createCLI({
        readonly: secret,
        readwrite: secret,
      });

      await expect(
        schemaPublish([
          ...(json ? ['--json'] : []),
          '--registry.accessToken',
          secret,
          '--author',
          'Kamil',
          '--commit',
          'abc123',
          ...serviceNameArgs,
          ...serviceUrlArgs,
          'fixtures/init-schema.graphql',
        ]),
      ).resolves.toMatchSnapshot('schemaPublish');

      const schema = await latestSchema();
      const numSchemas = schema.latestVersion?.schemas.nodes.length;
      const fetchCmd = cli.fetch({
        type: 'subgraphs',
        actionId: 'abc123',
      });
      const rHeader = `service\\s+url\\s+date`;
      const rUrl = `http:\\/\\/\\S+(:\\d+)?|n/a`;
      const rSubgraph = `[-]+\\s+\\S+\\s+(${rUrl})\\s+\\S+Z\\s+`;
      const rFooter = `subgraphs length: ${numSchemas}`;
      await expect(fetchCmd).resolves.toMatch(
        new RegExp(`${rHeader}\\s+(${rSubgraph}){${numSchemas}}${rFooter}`),
      );
    },
  );
});
