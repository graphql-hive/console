import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ProjectType } from 'testkit/gql/graphql';
import { initSeed } from 'testkit/seed';
import { getServiceHost } from 'testkit/utils';
import { execa } from '@esm2cjs/execa';

describe('Apollo Router Integration', () => {
  const getAvailablePort = () =>
    new Promise<number>(resolve => {
      const server = createServer();
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          const port = address.port;
          server.close(() => resolve(port));
        } else {
          throw new Error('Could not get available port');
        }
      });
    });
  it(
    'fetches the supergraph and sends usage reports',
    {
      retry: 3,
    },
    async () => {
      const routerConfigPath = join(tmpdir(), `apollo-router-config-${Date.now()}.yaml`);
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createTargetAccessToken, createCdnAccess, target, waitForOperationsCollected } =
        await createProject(ProjectType.Federation);
      const writeToken = await createTargetAccessToken({});

      // Publish Schema
      const publishSchemaResult = await writeToken
        .publishSchema({
          author: 'Arda',
          commit: 'abc123',
          sdl: /* GraphQL */ `
            type Query {
              me: User
            }
            type User {
              id: ID!
              name: String!
            }
          `,
          service: 'users',
          url: 'https://federation-demo.theguild.workers.dev/users',
        })
        .then(r => r.expectNoGraphQLErrors());

      expect(publishSchemaResult.schemaPublish.__typename).toBe('SchemaPublishSuccess');
      const cdnAccessResult = await createCdnAccess();

      const usageAddress = await getServiceHost('usage', 8081);

      const routerBinPath = join(__dirname, '../../../target/debug/router');
      if (!existsSync(routerBinPath)) {
        throw new Error(
          `Apollo Router binary not found at path: ${routerBinPath}, make sure to build it first with 'cargo build'`,
        );
      }
      const routerPort = await getAvailablePort();
      const routerConfigContent = `
supergraph:
  listen: 0.0.0.0:${routerPort}
plugins:
  hive.usage: {}
`.trim();
      writeFileSync(routerConfigPath, routerConfigContent, 'utf-8');
      const cdnEndpoint = await getServiceHost('server', 8082).then(
        v => `http://${v}/artifacts/v1/${target.id}`,
      );
      const routerProc = execa(routerBinPath, ['--dev', '--config', routerConfigPath], {
        all: true,
        env: {
          HIVE_CDN_ENDPOINT: cdnEndpoint,
          HIVE_CDN_KEY: cdnAccessResult.secretAccessToken,
          HIVE_ENDPOINT: `http://${usageAddress}`,
          HIVE_TOKEN: writeToken.secret,
        },
      });
      let log = '';
      await new Promise((resolve, reject) => {
        routerProc.catch(err => {
          if (!err.isCanceled) {
            reject(err);
          }
        });
        const routerProcOut = routerProc.all;
        if (!routerProcOut) {
          return reject(new Error('No stdout from Apollo Router process'));
        }
        routerProcOut.on('data', data => {
          log += data.toString();
          if (log.includes('GraphQL endpoint exposed at')) {
            resolve(true);
          }
        });
      });

      try {
        const url = `http://localhost:${routerPort}/`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            query: `
            query TestQuery {
              me {
                id
                name
              }
            }
          `,
          }),
        });

        expect(response.status).toBe(200);
        const result = await response.json();
        expect(result).toEqual({
          data: {
            me: {
              id: '1',
              name: 'Ada Lovelace',
            },
          },
        });
        await waitForOperationsCollected(1);
      } catch (e) {
        console.error('Router logs:\n', log);
        throw e;
      } finally {
        routerProc.cancel();
        rmSync(routerConfigPath);
      }
    },
  );
});
