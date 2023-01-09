import { ProjectType } from '@app/gql/graphql';
import { createCLI } from '../../testkit/cli';
import { prepareProject } from '../../testkit/registry-models';

describe('publish', () => {
  test.concurrent('accepted: composable', async () => {
    const { publish } = await prepare();
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
  });

  test.concurrent('rejected: composable, breaking changes', async () => {
    const { publish } = await prepare();
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
      expect: 'rejected',
    });
  });

  test.concurrent('accepted (invalid): composable, breaking changes (force)', async () => {
    const { publish } = await prepare();
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
      force: true,
      expect: 'latest',
    });
  });

  test.concurrent('accepted: composable, breaking changes (acceptBreakingChanges)', async () => {
    const { publish } = await prepare();
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
      acceptBreakingChanges: true,
    });
  });

  test.concurrent('accepted: composable, previous version was not', async () => {
    const { publish } = await prepare();

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
      force: true,
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

  test.concurrent(
    'accepted: composable, previous version was not (acceptBreakingChanges)',
    async () => {
      const { publish } = await prepare();

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
        force: true,
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
        acceptBreakingChanges: true,
      });
    },
  );

  test.concurrent('accepted (ignored): composable, no changes', async () => {
    const { publish } = await prepare();

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

  test.concurrent('accepted: composable, new url', async () => {
    const { publish } = await prepare();

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

  test.concurrent('rejected: missing service name', async () => {
    const { publish } = await prepare();

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
    const { publish } = await prepare();

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
});

describe('check', () => {
  test.concurrent('accepted: composable, no breaking changes', async () => {
    const { publish, check } = await prepare();

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
    const { publish, check } = await prepare();

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
      force: true,
    });

    const message = await check({
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
      expect: 'approved',
    });

    expect(message).toMatch('No changes');
  });

  test.concurrent('accepted: no changes', async () => {
    const { publish, check } = await prepare();

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
    const { check, publish } = await prepare();

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
          product(id: ID!): String
        }
      `,
      expect: 'rejected',
    });

    expect(message).toMatch('name');
  });

  test.concurrent('rejected: composable, breaking changes', async () => {
    const { publish, check } = await prepare();

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
    const { publish, check } = await prepare();

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

    const message = await check({
      sdl: /* GraphQL */ `
        type Query {
          product(id: ID!): Product
          topProduct: Product
        }
        type Product @key(fields: "it") {
          id: ID!
          name: String
        }
      `,
      serviceName: 'products',
      expect: 'rejected',
    });

    expect(message).toMatch('Product.it');
  });

  test.concurrent('rejected: not composable, breaking changes', async () => {
    const { publish, check } = await prepare();

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

    const message = await check({
      sdl: /* GraphQL */ `
        type Query {
          product(id: ID!): Product
        }
        type Product @key(fields: "it") {
          id: ID!
        }
      `,
      serviceName: 'products',
      expect: 'rejected',
    });

    expect(message).toMatch('Product.it');
    expect(message).toMatch('name');
  });
});

async function prepare() {
  const {
    tokens: { registry: token },
  } = await prepareProject(ProjectType.Federation);

  return createCLI(token);
}
