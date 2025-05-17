import { cases, isLegacyComposition, prepare } from './federation-utils';

describe('delete', () => {
  describe.concurrent.each(cases)('%s', (caseName, ffs) => {
    const legacyComposition = isLegacyComposition(caseName);

    test.concurrent('accepted: composable before and after', async () => {
      const { cli } = await prepare(ffs, legacyComposition);

      await cli.publish({
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

      await cli.publish({
        sdl: /* GraphQL */ `
          type Query {
            topReview: Review
          }

          type Review @key(fields: "id") {
            id: ID!
            title: String
          }
        `,
        serviceName: 'reviews',
        serviceUrl: 'http://reviews:3000/graphql',
        expect: 'latest-composable',
      });

      const message = await cli.delete({
        serviceName: 'reviews',
        expect: 'latest-composable',
      });

      expect(message).toMatch('reviews deleted');
    });

    test.concurrent('rejected: unknown service', async () => {
      const { cli } = await prepare(ffs, legacyComposition);

      await cli.publish({
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

      const message = await cli.delete({
        serviceName: 'unknown_service',
        expect: 'rejected',
      });

      expect(message).toMatch('not found');
    });
  });
});
