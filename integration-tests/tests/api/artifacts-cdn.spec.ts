import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ApolloGateway } from '@apollo/gateway';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ProjectType, TargetAccessScope } from '@app/gql/graphql';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createSupergraphManager } from '@graphql-hive/client';
import { fetch } from '@whatwg-node/fetch';
import { gql } from '../../testkit/gql';
import { execute } from '../../testkit/graphql';
import { initSeed } from '../../testkit/seed';
import { getServiceHost } from '../../testkit/utils';

const s3Client = new S3Client({
  endpoint: 'http://127.0.0.1:9000',
  region: 'auto',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

async function deleteS3Object(s3Client: S3Client, bucketName: string, keysToDelete: Array<string>) {
  if (keysToDelete.length) {
    const deleteObjectsCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: keysToDelete.map(key => ({ Key: key })) },
    });

    await s3Client.send(deleteObjectsCommand);
  }
}

async function deleteAllS3BucketObjects(s3Client: S3Client, bucketName: string) {
  const listObjectsCommand = new ListObjectsCommand({
    Bucket: bucketName,
  });
  const result = await s3Client.send(listObjectsCommand);
  const keysToDelete: Array<string> = [];

  if (result.Contents) {
    for (const item of result.Contents) {
      if (item.Key) {
        keysToDelete.push(item.Key);
      }
    }
  }

  await deleteS3Object(s3Client, bucketName, keysToDelete);
}

async function putS3Object(s3Client: S3Client, bucketName: string, key: string, body: string) {
  const putObjectCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
  });
  await s3Client.send(putObjectCommand);
}

async function fetchS3ObjectArtifact(
  bucketName: string,
  key: string,
): Promise<{ body: string; eTag: string }> {
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const result = await s3Client.send(getObjectCommand);
  return {
    body: await result.Body!.transformToString(),
    eTag: result.ETag!,
  };
}

beforeEach(async () => {
  await deleteAllS3BucketObjects(s3Client, 'artifacts');
});

function buildEndpointUrl(
  baseUrl: string,
  targetId: string,
  resourceType: 'sdl' | 'supergraph' | 'services' | 'metadata',
) {
  return `${baseUrl}${targetId}/${resourceType}`;
}

function generateLegacyToken(targetId: string) {
  const encoder = new TextEncoder();
  return crypto
    .createHmac('sha256', 'wowverysecuremuchsecret')
    .update(encoder.encode(targetId))
    .digest('base64');
}

/**
 * We have both a CDN that runs as part of the server and one that runs as a standalone service (cloudflare worker).
 */
function runArtifactsCDNTests(
  name: string,
  runtime: { service: string; port: number; path: string },
) {
  const getBaseEndpoint = () =>
    getServiceHost(runtime.service, runtime.port).then(v => `http://${v}${runtime.path}`);

  describe(`Artifacts CDN ${name}`, () => {
    test.concurrent('legacy cdn access key can be used for accessing artifacts', async () => {
      const endpointBaseUrl = await getBaseEndpoint();
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { target, createToken } = await createProject(ProjectType.Single);
      const token = await createToken({
        targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
      });

      await token
        .publishSchema({
          author: 'Kamil',
          commit: 'abc123',
          sdl: `type Query { ping: String }`,
        })
        .then(r => r.expectNoGraphQLErrors());

      // manually generate CDN access token for legacy support
      const legacyToken = generateLegacyToken(target.id);
      const legacyTokenHash = await bcrypt.hash(legacyToken, await bcrypt.genSalt(10));
      await putS3Object(s3Client, 'artifacts', `cdn-legacy-keys/${target.id}`, legacyTokenHash);

      const url = buildEndpointUrl(endpointBaseUrl, target.id, 'sdl');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-hive-cdn-key': legacyToken,
        },
      });

      expect(response.status).toEqual(200);
      expect(await response.text()).toMatchInlineSnapshot(`
        "type Query {
          ping: String
        }"
      `);
    });

    test.concurrent(
      'legacy deleting cdn access token from s3 revokes artifact cdn access',
      async () => {
        const { createOrg } = await initSeed().createOwner();
        const { createProject } = await createOrg();
        const { createToken, target } = await createProject(ProjectType.Single);
        const writeToken = await createToken({
          targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
        });

        await writeToken
          .publishSchema({
            author: 'Kamil',
            commit: 'abc123',
            sdl: `type Query { ping: String }`,
          })
          .then(r => r.expectNoGraphQLErrors());

        // manually generate CDN access token for legacy support
        const legacyToken = generateLegacyToken(target.id);
        const legacyTokenHash = await bcrypt.hash(legacyToken, await bcrypt.genSalt(10));
        await putS3Object(s3Client, 'artifacts', `cdn-legacy-keys/${target.id}`, legacyTokenHash);

        const endpointBaseUrl = await getBaseEndpoint();

        // First roundtrip
        const url = buildEndpointUrl(endpointBaseUrl, target.id, 'sdl');
        let response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-hive-cdn-key': legacyToken,
          },
        });
        expect(response.status).toEqual(200);
        expect(await response.text()).toMatchInlineSnapshot(`
                  "type Query {
                    ping: String
                  }"
                `);

        await deleteS3Object(s3Client, 'artifacts', [`cdn-legacy-keys/${target.id}`]);

        // Second roundtrip
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'x-hive-cdn-key': legacyToken,
          },
        });
        expect(response.status).toEqual(403);
      },
    );

    test.concurrent('access without credentials', async () => {
      const endpointBaseUrl = await getBaseEndpoint();
      const url = buildEndpointUrl(endpointBaseUrl, 'i-do-not-exist', 'sdl');
      const response = await fetch(url, { method: 'GET' });
      expect(response.status).toEqual(400);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(await response.json()).toEqual({
        code: 'MISSING_AUTH_KEY',
        error: 'Hive CDN authentication key is missing',
        description:
          'Please refer to the documentation for more details: https://docs.graphql-hive.com/features/registry-usage',
      });
      expect(response.headers.get('location')).toEqual(null);
    });

    test.concurrent('access invalid credentials', async () => {
      const endpointBaseUrl = await getBaseEndpoint();
      const url = buildEndpointUrl(endpointBaseUrl, 'i-do-not-exist', 'sdl');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-hive-cdn-key': 'skrrtbrrrt',
        },
      });
      expect(response.status).toEqual(403);
      expect(response.headers.get('content-type')).toContain('application/json');
      expect(await response.json()).toEqual({
        code: 'INVALID_AUTH_KEY',
        error:
          'Hive CDN authentication key is invalid, or it does not match the requested target ID.',
        description:
          'Please refer to the documentation for more details: https://docs.graphql-hive.com/features/registry-usage',
      });
      expect(response.headers.get('location')).toEqual(null);
    });

    test.concurrent('access SDL artifact with valid credentials', async () => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createToken, target } = await createProject(ProjectType.Single);
      const writeToken = await createToken({
        targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
      });

      // Publish Schema
      const publishSchemaResult = await writeToken
        .publishSchema({
          author: 'Kamil',
          commit: 'abc123',
          sdl: `type Query { ping: String }`,
        })
        .then(r => r.expectNoGraphQLErrors());

      expect(publishSchemaResult.schemaPublish.__typename).toEqual('SchemaPublishSuccess');
      const cdnAccessResult = await writeToken.createCdnAccess();
      const endpointBaseUrl = await getBaseEndpoint();
      const url = buildEndpointUrl(endpointBaseUrl, target.id, 'sdl');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-hive-cdn-key': cdnAccessResult.token,
        },
        redirect: 'manual',
      });

      expect(response.status).toMatchInlineSnapshot(`302`);
      expect(await response.text()).toMatchInlineSnapshot(`"Found."`);
      expect(response.headers.get('location')).toBeDefined();

      const artifactContents = await fetchS3ObjectArtifact(
        'artifacts',
        `artifact/${target.id}/sdl`,
      );
      expect(artifactContents.body).toMatchInlineSnapshot(`
        "type Query {
          ping: String
        }"
      `);
    });

    test.concurrent('access services artifact with valid credentials', async () => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createToken, target } = await createProject(ProjectType.Federation);
      const writeToken = await createToken({
        targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
      });

      // Publish Schema
      const publishSchemaResult = await writeToken
        .publishSchema({
          author: 'Kamil',
          commit: 'abc123',
          sdl: `type Query { ping: String }`,
          service: 'ping',
          url: 'ping.com',
        })
        .then(r => r.expectNoGraphQLErrors());

      expect(publishSchemaResult.schemaPublish.__typename).toEqual('SchemaPublishSuccess');

      // check if artifact exists in bucket
      const artifactContents = await fetchS3ObjectArtifact(
        'artifacts',
        `artifact/${target.id}/services`,
      );
      expect(artifactContents.body).toMatchInlineSnapshot(
        `"[{"name":"ping","sdl":"type Query { ping: String }","url":"ping.com"}]"`,
      );

      const cdnAccessResult = await writeToken.createCdnAccess();
      const endpointBaseUrl = await getBaseEndpoint();
      const url = buildEndpointUrl(endpointBaseUrl, target.id, 'services');
      let response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-hive-cdn-key': cdnAccessResult.token,
        },
        redirect: 'manual',
      });

      expect(response.status).toMatchInlineSnapshot(`302`);
      expect(await response.text()).toMatchInlineSnapshot(`"Found."`);
      const locationHeader = response.headers.get('location');
      expect(locationHeader).toBeDefined();
      const locationUrl = new URL(locationHeader!);
      expect(locationUrl.protocol).toEqual('http:');
      expect(locationUrl.hostname).toEqual('localhost');
      expect(locationUrl.port).toEqual('8083');

      response = await fetch(locationHeader!, {
        method: 'GET',
        redirect: 'manual',
      });
      const body = await response.text();
      expect(response.status).toEqual(200);
      expect(body).toMatchInlineSnapshot(
        `"[{"name":"ping","sdl":"type Query { ping: String }","url":"ping.com"}]"`,
      );
    });

    test.concurrent('access services artifact with if-none-match header', async () => {
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createToken, target } = await createProject(ProjectType.Federation);
      const writeToken = await createToken({
        targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
      });

      // Publish Schema

      const publishSchemaResult = await writeToken
        .publishSchema({
          author: 'Kamil',
          commit: 'abc123',
          sdl: `type Query { ping: String }`,
          service: 'ping',
          url: 'ping.com',
        })
        .then(r => r.expectNoGraphQLErrors());

      expect(publishSchemaResult.schemaPublish.__typename).toEqual('SchemaPublishSuccess');

      // check if artifact exists in bucket
      const artifactContents = await fetchS3ObjectArtifact(
        'artifacts',
        `artifact/${target.id}/services`,
      );
      expect(artifactContents.body).toMatchInlineSnapshot(
        `"[{"name":"ping","sdl":"type Query { ping: String }","url":"ping.com"}]"`,
      );

      const cdnAccessResult = await writeToken.createCdnAccess();
      const endpointBaseUrl = await getBaseEndpoint();
      const url = buildEndpointUrl(endpointBaseUrl, target.id, 'services');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'x-hive-cdn-key': cdnAccessResult.token,
          'if-none-match': artifactContents.eTag,
        },
        redirect: 'manual',
      });

      expect(response.status).toMatchInlineSnapshot(`304`);
    });

    test.concurrent('access services artifact with ApolloGateway and ApolloServer', async () => {
      const endpointBaseUrl = await getBaseEndpoint();
      const { createOrg } = await initSeed().createOwner();
      const { createProject } = await createOrg();
      const { createToken, target } = await createProject(ProjectType.Federation);
      const writeToken = await createToken({
        targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
      });

      // Publish Schema
      const publishSchemaResult = await writeToken
        .publishSchema({
          author: 'Kamil',
          commit: 'abc123',
          sdl: `type Query { ping: String }`,
          service: 'ping',
          url: 'ping.com',
        })
        .then(r => r.expectNoGraphQLErrors());

      expect(publishSchemaResult.schemaPublish.__typename).toEqual('SchemaPublishSuccess');
      const cdnAccessResult = await writeToken.createCdnAccess();

      const gateway = new ApolloGateway({
        supergraphSdl: createSupergraphManager({
          endpoint: endpointBaseUrl + target.id,
          key: cdnAccessResult.token,
        }),
      });

      const server = new ApolloServer({
        gateway,
      });

      try {
        const { url } = await startStandaloneServer(server);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            query: /* GraphQL */ `
              {
                __schema {
                  types {
                    name
                    fields {
                      name
                    }
                  }
                }
              }
            `,
          }),
        });

        expect(response.status).toEqual(200);
        const result = await response.json();
        expect(result.data.__schema.types).toContainEqual({
          name: 'Query',
          fields: [{ name: 'ping' }],
        });
      } finally {
        await server.stop();
      }
    });
  });
}

runArtifactsCDNTests('API Mirror', { service: 'server', port: 8082, path: '/artifacts/v1/' });
// runArtifactsCDNTests('Local CDN Mock', 'http://127.0.0.1:3004/artifacts/v1/');

describe('CDN token', () => {
  const TargetCDNTokensQuery = gql(/* GraphQL */ `
    query TargetCDNTokens($selector: TargetSelectorInput!, $after: String, $first: Int = 2) {
      target(selector: $selector) {
        cdnTokens(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            cursor
            node {
              id
              firstCharacters
              lastCharacters
              createdAt
            }
          }
        }
      }
    }
  `);

  it('connection pagination', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { organization, createProject } = await createOrg();
    const { project, target, createToken } = await createProject(ProjectType.Federation);

    const token = await createToken({
      targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.Settings],
    });

    await Promise.all(new Array(5).fill(0).map(() => token.createCdnAccess()));

    let result = await execute({
      document: TargetCDNTokensQuery,
      variables: {
        selector: {
          organization: organization.cleanId,
          project: project.cleanId,
          target: target.cleanId,
        },
      },
      authToken: token.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.target!.cdnTokens.edges).toHaveLength(2);
    expect(result.target!.cdnTokens.pageInfo.hasNextPage).toEqual(true);
    let endCursor = result.target!.cdnTokens.pageInfo.endCursor;

    result = await execute({
      document: TargetCDNTokensQuery,
      variables: {
        selector: {
          organization: organization.cleanId,
          project: project.cleanId,
          target: target.cleanId,
        },
        after: endCursor,
      },
      authToken: token.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.target!.cdnTokens.edges).toHaveLength(2);
    expect(result.target!.cdnTokens.pageInfo.hasNextPage).toEqual(true);
    endCursor = result.target!.cdnTokens.pageInfo.endCursor;

    result = await execute({
      document: TargetCDNTokensQuery,
      variables: {
        selector: {
          organization: organization.cleanId,
          project: project.cleanId,
          target: target.cleanId,
        },
        after: endCursor,
      },
      authToken: token.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.target!.cdnTokens.edges).toHaveLength(1);
    expect(result.target!.cdnTokens.pageInfo.hasNextPage).toEqual(false);
  });

  it('new created access tokens are added at the beginning of the connection', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { organization, createProject } = await createOrg();
    const { project, target, createToken } = await createProject(ProjectType.Federation);

    const token = await createToken({
      targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.Settings],
    });

    await token.createCdnAccess();

    const firstResult = await execute({
      document: TargetCDNTokensQuery,
      variables: {
        selector: {
          organization: organization.cleanId,
          project: project.cleanId,
          target: target.cleanId,
        },
        first: 2,
      },
      authToken: token.secret,
    }).then(r => r.expectNoGraphQLErrors());

    const firstId = firstResult.target!.cdnTokens.edges[0].node.id;
    expect(firstResult.target!.cdnTokens.edges).toHaveLength(1);

    await token.createCdnAccess();

    const secondResult = await execute({
      document: TargetCDNTokensQuery,
      variables: {
        selector: {
          organization: organization.cleanId,
          project: project.cleanId,
          target: target.cleanId,
        },
        first: 2,
      },
      authToken: token.secret,
    }).then(r => r.expectNoGraphQLErrors());
    expect(secondResult.target!.cdnTokens.edges).toHaveLength(2);
    expect(secondResult.target!.cdnTokens.edges[1].node.id).toEqual(firstId);
  });
});
