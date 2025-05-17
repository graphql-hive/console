import { normalizeCliOutput } from '../../../scripts/serializers/cli-output';
import { cases, isLegacyComposition, prepare } from './federation-utils';

describe('check', () => {
  describe.concurrent.each(cases)('%s', (caseName, ffs) => {
    const legacyComposition = isLegacyComposition(caseName);

    test.concurrent('accepted: composable, no breaking changes', async () => {
      const {
        cli: { publish, check },
      } = await prepare(ffs, legacyComposition);

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

      const message = await check({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
            topProductName: String
          }
        `,
        serviceName: 'products',
        expect: 'approved',
      });

      expect(message).toMatch('topProductName');
    });

    test.concurrent('accepted: composable, previous version was not', async () => {
      const {
        cli: { publish, check },
      } = await prepare(ffs, legacyComposition);

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

      await check({
        sdl: /* GraphQL */ `
          type Query {
            product(id: ID!): Product
            topProduct: Product
          }
          type Product @key(fields: "id") {
            id: ID!
            name: String
          }
        `,
        serviceName: 'products',
        expect: 'approved',
      });
    });

    test.concurrent('accepted: no changes', async () => {
      const {
        cli: { publish, check },
      } = await prepare(ffs, legacyComposition);

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

      await check({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        serviceName: 'products',
        expect: 'approved',
      });
    });

    test.concurrent('rejected: missing service name', async () => {
      const {
        cli: { check },
      } = await prepare(ffs, legacyComposition);

      const message = await check({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
          }
        `,
        expect: 'rejected',
      });

      expect(message).toMatch('name');
    });

    test.concurrent('rejected: composable, breaking changes', async () => {
      const {
        cli: { publish, check },
      } = await prepare(ffs, legacyComposition);

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

      const message = await check({
        sdl: /* GraphQL */ `
          type Query {
            topProductName: String
          }
        `,
        serviceName: 'products',
        expect: 'rejected',
      });

      expect(message).toMatch('removed');
    });

    test.concurrent('rejected: not composable, no breaking changes', async () => {
      const {
        cli: { publish, check },
      } = await prepare(ffs, legacyComposition);

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

      const message = await check({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: String
            topProductName: Strin
          }
        `,
        serviceName: 'products',
        expect: 'rejected',
      });

      expect(message).toMatch('Strin');
    });

    test.concurrent('rejected: not composable, breaking changes', async () => {
      const {
        cli: { publish, check },
      } = await prepare(ffs, legacyComposition);

      await publish({
        sdl: /* GraphQL */ `
          type Query {
            topProduct: Product
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

      const message = normalizeCliOutput(
        await check({
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
          expect: 'rejected',
        }),
      );

      if (legacyComposition) {
        expect(message).toMatch('Product.it');
        expect(message).toMatch('topProduct');
      } else {
        expect(message).toContain('Cannot query field it on type Product');
      }
    });
  });
});
