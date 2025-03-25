import { getServiceHost } from 'testkit/utils';
import type { SchemaBuilderApi } from '@hive/schema';
import { createTRPCProxyClient, httpLink } from '@trpc/client';

const host =
  process.env['SCHEMA_SERVICE_HOST_OVERRIDE'] ||
  (await getServiceHost('schema', 3002).then(r => `http://${r}`));

const client = createTRPCProxyClient<SchemaBuilderApi>({
  links: [
    httpLink({
      url: host + `/trpc`,
      fetch,
    }),
  ],
});

test('try to break service', async () => {
  const result = await client.composeAndValidate.mutate({
    type: 'federation',
    native: true,
    schemas: [
      {
        raw: /* GraphQL */ `
          type Query {
            var1: Boolean
          }
        `,
        source: 'foo.graphql',
        url: null,
      },
      {
        raw: /* GraphQL */ `
          type Query {
            a: Boolean
          }
        `,
        source: 'b.graphql',
        url: null,
      },
    ],
    external: null,
  });

  console.log(result);
});
