import { normalizeCliOutput } from '../../../scripts/serializers/cli-output';
import { cases, isLegacyComposition, prepare } from './federation-utils';

describe('publish', () => {
  describe.concurrent.each(cases)('%s', (caseName, ffs) => {
    const legacyComposition = isLegacyComposition(caseName);

    test.concurrent('accepted: composable', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);
      await publish({
        sdl: `type Query { topProductName: String }`,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'latest-composable',
      });
    });

    test.concurrent('accepted: composable, breaking changes', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProductName: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'latest-composable',
      });

      await publish({
        sdl: /* GraphQL */ `
          type Query {
            nooooo: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'latest-composable',
      });
    });

    test.concurrent(
      `${legacyComposition ? 'rejected' : 'accepted'}: not composable (graphql errors)`,
      async () => {
        const {
          cli: { publish },
        } = await prepare(ffs, legacyComposition);

        // non-composable
        await publish({
          sdl: /* GraphQL */ `
            type Query {
              topProduct: Product
            }
          `,
          serviceName: 'products',
          serviceUrl: 'http://products:3000/graphql',
          expect: legacyComposition ? 'rejected' : 'latest',
        });
      },
    );

    test.concurrent('accepted: composable, previous version was not', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      // non-composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }
          type Product @key(fields: "it") {
            id: ID!
            name: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'latest',
      });

      // composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            product(id: ID!): Product
          }
          type Product @key(fields: "id") {
            id: ID!
            name: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'latest-composable',
      });
    });

    test.concurrent('accepted: composable, no changes', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      // composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'latest-composable',
      });

      // composable but no changes
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'ignored',
      });
    });

    test.concurrent('accepted: composable, no changes, no metadata modification', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      // composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        metadata: { products: 3000 },
        expect: 'latest-composable',
      });

      // composable but no changes
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        metadata: { products: 3000 },
        expect: 'ignored',
      });
    });

    test.concurrent('accepted: composable, new url', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      // composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        expect: 'latest-composable',
      });

      // composable, no changes, only url is different
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:4321/graphql', // new url
        expect: 'latest-composable',
      });
    });

    test.concurrent('accepted: composable, new metadata', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      // composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        metadata: { products: 'old' },
        expect: 'latest-composable',
      });

      // composable, no changes, only url is different
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
        metadata: { products: 'new' }, // new metadata
        expect: 'latest-composable',
      });
    });

    test.concurrent('rejected: missing service name', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      // composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceUrl: 'http://products:3000/graphql',
        expect: 'rejected',
      });
    });

    test.concurrent('rejected: missing service url', async () => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      // composable
      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        expect: 'rejected',
      });
    });

    test.concurrent('CLI output', async ({ expect }) => {
      const {
        cli: { publish },
      } = await prepare(ffs, legacyComposition);

      const service = {
        serviceName: 'products',
        serviceUrl: 'http://products:3000/graphql',
      };

      let output = normalizeCliOutput(
        (await publish({
          sdl: /* GraphQL */ `
            type Query {
              topProduct: Product
            }

            type Product {
              id: ID!
              name: String!
            }
          `,
          ...service,
          expect: 'latest-composable',
        })) ?? '',
      );

      expect(output).toEqual(expect.stringContaining(`v Published initial schema.`));
      expect(output).toEqual(
        expect.stringContaining(`i Available at $appUrl/$organization/$project/$target`),
      );

      output = normalizeCliOutput(
        (await publish({
          sdl: /* GraphQL */ `
            type Query {
              topProduct: Product
            }

            type Product {
              id: ID!
              name: String!
              price: Int!
            }
          `,
          ...service,
          expect: 'latest-composable',
        })) ?? '',
      );

      expect(output).toEqual(expect.stringContaining(`v Schema published`));
      expect(output).toEqual(
        expect.stringContaining(
          `i Available at $appUrl/$organization/$project/$target/history/$version`,
        ),
      );
    });
  });
});
