import { ProjectType } from 'testkit/gql/graphql';
import { schemaPublish } from '../../testkit/cli';
import { initSeed } from '../../testkit/seed';
import { cases, prepare } from './federation-utils';

describe('other', () => {
  describe.concurrent.each(cases)('%s', (_, ffs) => {
    test.concurrent('service url should be available in supergraph', async () => {
      const { createOrg } = await initSeed().createOwner();
      const { inviteAndJoinMember, createProject } = await createOrg();
      await inviteAndJoinMember();
      const { createTargetAccessToken, createCdnAccess } = await createProject(
        ProjectType.Federation,
      );
      const { secret } = await createTargetAccessToken({});
      const { fetchSupergraphFromCDN } = await createCdnAccess();

      await schemaPublish([
        '--token',
        secret,
        '--author',
        'Kamil',
        '--commit',
        'abc123',
        '--service',
        'users',
        '--url',
        'https://api.com/users-subgraph',
        'fixtures/federation-init.graphql',
      ]);

      const supergraph = await fetchSupergraphFromCDN();
      expect(supergraph.body).toMatch('(name: "users", url: "https://api.com/users-subgraph")');
    });

    test.concurrent(
      'publishing composable schema without the definition of the Query type, but only extension, should work',
      async () => {
        const { createOrg } = await initSeed().createOwner();
        const { createProject, setFeatureFlag } = await createOrg();

        for await (const [name, enabled] of ffs) {
          await setFeatureFlag(name, enabled);
        }

        const { createTargetAccessToken } = await createProject(ProjectType.Federation);
        const readWriteToken = await createTargetAccessToken({});

        await readWriteToken.publishSchema({
          service: 'products',
          author: 'Kamil',
          commit: 'products',
          url: 'https://api.com/products',
          experimental_acceptBreakingChanges: true,
          force: true,
          sdl: /* GraphQL */ `
            type Product @key(fields: "id") {
              id: ID!
              title: String
              url: String
            }

            extend type Query {
              product(id: ID!): Product
            }
          `,
        });

        await readWriteToken.publishSchema({
          service: 'users',
          author: 'Kamil',
          commit: 'users',
          url: 'https://api.com/users',
          experimental_acceptBreakingChanges: true,
          force: true,
          sdl: /* GraphQL */ `
            type User @key(fields: "id") {
              id: ID!
              name: String!
            }

            extend type Query {
              user(id: ID!): User
            }
          `,
        });

        const latestValid = await readWriteToken.fetchLatestValidSchema();
        expect(latestValid.latestValidVersion?.schemas.nodes[0]).toEqual(
          expect.objectContaining({
            commit: 'users',
          }),
        );
      },
    );

    test.concurrent(
      '(experimental_acceptBreakingChanges and force) publishing composable schema on second attempt',
      async () => {
        const { createOrg } = await initSeed().createOwner();
        const { createProject, setFeatureFlag } = await createOrg();

        for await (const [name, enabled] of ffs) {
          await setFeatureFlag(name, enabled);
        }

        const { createTargetAccessToken } = await createProject(ProjectType.Federation);
        const readWriteToken = await createTargetAccessToken({});

        await readWriteToken.publishSchema({
          service: 'reviews',
          author: 'Kamil',
          commit: 'reviews',
          url: 'https://api.com/reviews',
          experimental_acceptBreakingChanges: true,
          force: true,
          sdl: /* GraphQL */ `
            extend type Product @key(fields: "id") {
              id: ID! @external
              reviews: [Review]
              reviewSummary: ReviewSummary
            }

            type Review @key(fields: "id") {
              id: ID!
              rating: Float
            }

            type ReviewSummary {
              totalReviews: Int
            }
          `,
        });

        await readWriteToken.publishSchema({
          service: 'products',
          author: 'Kamil',
          commit: 'products',
          url: 'https://api.com/products',
          experimental_acceptBreakingChanges: true,
          force: true,
          sdl: /* GraphQL */ `
            enum CURRENCY_CODE {
              USD
            }

            type Department {
              category: ProductCategory
              url: String
            }

            type Money {
              amount: Float
              currencyCode: CURRENCY_CODE
            }

            type Price {
              cost: Money
              deal: Float
              dealSavings: Money
            }

            type Product @key(fields: "id") {
              id: ID!
              title: String
              url: String
              description: String
              price: Price
              salesRank(category: ProductCategory = ALL): Int
              salesRankOverall: Int
              salesRankInCategory: Int
              category: ProductCategory
              images(size: Int = 1000): [String]
              primaryImage(size: Int = 1000): String
            }

            enum ProductCategory {
              ALL
              GIFT_CARDS
              ELECTRONICS
              CAMERA_N_PHOTO
              VIDEO_GAMES
              BOOKS
              CLOTHING
            }

            extend type Query {
              categories: [Department]
              product(id: ID!): Product
            }
          `,
        });

        const latestValid = await readWriteToken.fetchLatestValidSchema();
        expect(latestValid.latestValidVersion?.schemas.nodes[0]).toEqual(
          expect.objectContaining({
            commit: 'products',
          }),
        );
      },
    );

    test.concurrent('metadata should always be published as an array', async () => {
      const { cli, cdn } = await prepare(ffs);

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
        metadata: { products: 'v1' },
        expect: 'latest-composable',
      });

      await expect(cdn.fetchMetadata()).resolves.toEqual(
        expect.objectContaining({
          status: 200,
          body: [{ products: 'v1' }], // array
        }),
      );

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
        metadata: { reviews: 'v1' },
        expect: 'latest-composable',
      });

      await expect(cdn.fetchMetadata()).resolves.toEqual(
        expect.objectContaining({
          status: 200,
          body: [{ products: 'v1' }, { reviews: 'v1' }], // array
        }),
      );

      await cli.delete({
        serviceName: 'reviews',
        expect: 'latest-composable',
      });

      await expect(cdn.fetchMetadata()).resolves.toEqual(
        expect.objectContaining({
          status: 200,
          body: [{ products: 'v1' }], // array
        }),
      );
    });
  });
});
