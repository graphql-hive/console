/* eslint-disable no-process-env */
import { createHash } from 'node:crypto';
import { ProjectType } from 'testkit/gql/graphql';
import { createCLI, schemaCheck, schemaPublish } from '../../testkit/cli';
import { CliOutputSnapshot } from '../../testkit/cli-output-snapshot';
import { initSeed } from '../../testkit/seed';

expect.addSnapshotSerializer(CliOutputSnapshot.serializer);

describe.each([ProjectType.Stitching, ProjectType.Federation, ProjectType.Single])(
  '%s',
  projectType => {
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
        const { createTargetAccessToken } = await createProject(projectType);
        const { secret } = await createTargetAccessToken({});

        await expect(
          schemaPublish([
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
        const { createTargetAccessToken } = await createProject(projectType);
        const { secret } = await createTargetAccessToken({});

        await expect(
          schemaPublish([
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
            '--service',
            'test',
            '--registry.accessToken',
            secret,
            'fixtures/nonbreaking-schema.graphql',
          ]),
        ).resolves.toMatchSnapshot('schemaCheck (non-breaking)');

        await expect(
          schemaCheck([
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
        const { createTargetAccessToken } = await createProject(projectType);
        const { secret } = await createTargetAccessToken({});

        await expect(
          schemaPublish([
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
      const { project, target, createTargetAccessToken } = await createProject(projectType);
      const { secret } = await createTargetAccessToken({});

      await expect(
        schemaPublish([
          ...serviceNameArgs,
          ...serviceUrlArgs,
          '--registry.accessToken',
          secret,
          'fixtures/init-schema.graphql',
        ]),
      ).resolves.toMatch(
        `Available at ${process.env.HIVE_APP_BASE_URL}/${organization.slug}/${project.slug}/${target.slug}`,
      );

      await expect(
        schemaPublish([
          ...serviceNameArgs,
          ...serviceUrlArgs,
          '--registry.accessToken',
          secret,
          'fixtures/nonbreaking-schema.graphql',
        ]),
      ).resolves.toMatch(
        `Available at ${process.env.HIVE_APP_BASE_URL}/${organization.slug}/${project.slug}/${target.slug}/history/`,
      );
    });

    test.concurrent(
      'schema:check should notify user when registry is empty',
      async ({ expect }) => {
        const { createOrg } = await initSeed().createOwner();
        const { inviteAndJoinMember, createProject } = await createOrg();
        await inviteAndJoinMember();
        const { createTargetAccessToken } = await createProject(projectType);
        const { secret } = await createTargetAccessToken({});

        await expect(
          schemaCheck([
            '--registry.accessToken',
            secret,
            ...serviceNameArgs,
            'fixtures/init-schema.graphql',
          ]),
        ).resolves.toMatchSnapshot('schemaCheck');
      },
    );

    test.concurrent('schema:check should throw on corrupted schema', async ({ expect }) => {
      const { createOrg } = await initSeed().createOwner();
      const { inviteAndJoinMember, createProject } = await createOrg();
      await inviteAndJoinMember();
      const { createTargetAccessToken } = await createProject(projectType);
      const { secret } = await createTargetAccessToken({});

      await expect(
        schemaCheck([
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
            await createProject(projectType);
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
        const { createTargetAccessToken } = await createProject(projectType);
        const { secret, latestSchema } = await createTargetAccessToken({});

        const cli = createCLI({
          readonly: secret,
          readwrite: secret,
        });

        await expect(
          schemaPublish([
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
  },
);
