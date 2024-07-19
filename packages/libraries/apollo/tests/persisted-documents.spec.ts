import { type IncomingMessage } from 'node:http';
import nock from 'nock';
import { beforeEach, expect, test } from 'vitest';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { useHive } from '../src';

beforeEach(() => {
  nock.cleanAll();
});

type ApolloServerContext = {
  req: IncomingMessage;
};

test('use persisted documents (GraphQL over HTTP "documentId")', async () => {
  const httpScope = nock('http://artifatcs-cdn.localhost', {
    reqheaders: {
      'X-Hive-CDN-Key': value => {
        expect(value).toBe('foo');
        return true;
      },
    },
  })
    .get('/apps/client-name/client-version/hash')
    .reply(200, 'query { hi }');

  const testServer = new ApolloServer({
    typeDefs: /* GraphQL */ `
      type Query {
        hi: String
      }
    `,
    plugins: [
      useHive({
        token: 'token',
        experimental__persistedDocuments: {
          cdn: {
            endpoint: 'http://artifatcs-cdn.localhost',
            accessToken: 'foo',
          },
        },
      }),
    ],
  });
  const { url } = await startStandaloneServer(testServer, {
    async context({ req }): Promise<ApolloServerContext> {
      return { req };
    },
    listen: {
      port: 0,
    },
  });
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: 'client-name/client-version/hash',
    }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ data: { hi: null } });

  httpScope.done();
  await testServer.stop();
});

test('persisted document not found (GraphQL over HTTP "documentId")', async () => {
  const httpScope = nock('http://artifatcs-cdn.localhost', {
    reqheaders: {
      'X-Hive-CDN-Key': value => {
        expect(value).toBe('foo');
        return true;
      },
    },
  })
    .get('/apps/client-name/client-version/hash')
    .reply(404);

  const testServer = new ApolloServer({
    typeDefs: /* GraphQL */ `
      type Query {
        hi: String
      }
    `,
    plugins: [
      useHive({
        token: 'token',
        experimental__persistedDocuments: {
          cdn: {
            endpoint: 'http://artifatcs-cdn.localhost',
            accessToken: 'foo',
          },
        },
      }),
    ],
  });
  const { url } = await startStandaloneServer(testServer, {
    async context({ req }): Promise<ApolloServerContext> {
      return { req };
    },
    listen: {
      port: 0,
    },
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: 'client-name/client-version/hash',
    }),
  });

  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    errors: [
      {
        message: 'Persisted document not found.',
        extensions: {
          code: 'PERSISTED_DOCUMENT_NOT_FOUND',
        },
      },
    ],
  });

  httpScope.done();
});

test('arbitrary options are rejected with allowArbitraryDocuments=false (GraphQL over HTTP)', async () => {
  const testServer = new ApolloServer({
    typeDefs: /* GraphQL */ `
      type Query {
        hi: String
      }
    `,
    plugins: [
      useHive({
        token: 'token',
        experimental__persistedDocuments: {
          cdn: {
            endpoint: 'http://artifatcs-cdn.localhost',
            accessToken: 'foo',
          },
          allowArbitraryDocuments: false,
        },
      }),
    ],
  });
  const { url } = await startStandaloneServer(testServer, {
    async context({ req }): Promise<ApolloServerContext> {
      return { req };
    },
    listen: {
      port: 0,
    },
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'query { hi }',
    }),
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    errors: [
      {
        message: 'No persisted document provided.',
        extensions: { code: 'PERSISTED_DOCUMENT_REQUIRED' },
      },
    ],
  });
  await testServer.stop();
});

test('arbitrary options are allowed with allowArbitraryDocuments=true (GraphQL over HTTP)', async () => {
  const testServer = new ApolloServer({
    typeDefs: /* GraphQL */ `
      type Query {
        hi: String
      }
    `,
    plugins: [
      useHive({
        token: 'token',
        experimental__persistedDocuments: {
          cdn: {
            endpoint: 'http://artifatcs-cdn.localhost',
            accessToken: 'foo',
          },
          allowArbitraryDocuments: true,
        },
      }),
    ],
  });
  const { url } = await startStandaloneServer(testServer, {
    async context({ req }): Promise<ApolloServerContext> {
      return { req };
    },
    listen: {
      port: 0,
    },
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'query { hi }',
    }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    data: {
      hi: null,
    },
  });
  await testServer.stop();
});

test('usage reporting for persisted document', async () => {
  const httpScope = nock('http://artifatcs-cdn.localhost', {
    reqheaders: {
      'X-Hive-CDN-Key': value => {
        expect(value).toBe('foo');
        return true;
      },
    },
  })
    .get('/apps/client-name/client-version/hash')
    .reply(200, 'query { hi }');

  const usageScope = nock('http://localhost', {
    reqheaders: {
      Authorization: value => {
        expect(value).toBe('Bearer brrrt');
        return true;
      },
    },
  })
    .post('/usage', body => {
      expect(body.map).toMatchInlineSnapshot(`
        {
          ace78a32bbf8a79071356e5d5b13c5c83baf4e14: {
            fields: [
              Query.hi,
            ],
            operation: {hi},
            operationName: anonymous,
          },
        }
      `);

      expect(body.operations).toMatchObject([
        {
          metadata: {},
          operationMapKey: 'ace78a32bbf8a79071356e5d5b13c5c83baf4e14',
          persistedDocumentHash: 'client-name/client-version/hash',
        },
      ]);

      return true;
    })
    .reply(200);

  const testServer = new ApolloServer({
    typeDefs: /* GraphQL */ `
      type Query {
        hi: String
      }
    `,
    plugins: [
      useHive({
        enabled: true,
        debug: false,
        token: 'brrrt',
        experimental__persistedDocuments: {
          cdn: {
            endpoint: 'http://artifatcs-cdn.localhost',
            accessToken: 'foo',
          },
        },
        selfHosting: {
          applicationUrl: 'http://localhost/foo',
          graphqlEndpoint: 'http://localhost/graphql',
          usageEndpoint: 'http://localhost/usage',
        },
        usage: {
          endpoint: 'http://localhost/usage',
        },
        agent: {
          maxSize: 1,
        },
      }),
    ],
  });
  const { url } = await startStandaloneServer(testServer, {
    async context({ req }): Promise<ApolloServerContext> {
      return { req };
    },
    listen: {
      port: 0,
    },
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve();
    }, 1000);
    let requestCount = 0;

    usageScope.on('request', () => {
      requestCount = requestCount + 1;
      if (requestCount === 1) {
        clearTimeout(timeout);
        resolve();
      }
    });

    (async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: 'client-name/client-version/hash',
        }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ data: { hi: null } });
    })().catch(reject);
  });

  await testServer.stop();

  httpScope.done();
  usageScope.done();
});
