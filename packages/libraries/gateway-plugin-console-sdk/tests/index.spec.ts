import { GraphQLError, ValidationRule, type GraphQLResolveInfo } from 'graphql';
import { createSchema, createYoga, type Plugin } from 'graphql-yoga';
import { createGatewayRuntime } from '@graphql-hive/gateway-runtime';
import { createHive, useHive } from '../src';

describe('field-level usage reporting', () => {
  it('recomputes transformed documents after a schema change (object type turn into abstract type)', async () => {
    const executedSelections: string[][] = [];
    const itemResolver = (
      _parent: unknown,
      _args: unknown,
      _context: unknown,
      info: GraphQLResolveInfo,
    ) => {
      executedSelections.push(
        info.fieldNodes.flatMap(
          fieldNode =>
            fieldNode.selectionSet?.selections.flatMap(selection =>
              selection.kind === 'Field' ? [selection.name.value] : [],
            ) ?? [],
        ),
      );
      return { __typename: 'Product', id: '1' };
    };

    let schema = createSchema({
      typeDefs: /* GraphQL */ `
        type Item {
          id: ID!
        }
        type Query {
          item: Item
        }
      `,
      resolvers: {
        Query: { item: itemResolver },
      },
    });

    const rule: ValidationRule = context => ({
      Field(node) {
        if (node.alias?.value === '__hive_typename__') {
          context.reportError(new GraphQLError('Hive typename was injected too early'));
        }
      },
    });

    const validationPlugin: Plugin = {
      onValidate({ addValidationRule }) {
        addValidationRule(rule);
      },
    };

    await using yoga = createYoga({
      schema: () => schema,
      plugins: [
        validationPlugin,
        useHive({
          enabled: false,
          token: 'dummy-token',
          reporting: false,
          usage: {
            fieldLevelMetricsEnabled: true,
          },
        }),
      ],
      logging: false,
    });
    const request = () =>
      yoga.fetch('http://localhost/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: '{ item { id } }' }),
      });

    await request();
    expect(executedSelections[0]).toEqual(['id']);

    schema = createSchema({
      typeDefs: /* GraphQL */ `
        interface Item {
          id: ID!
        }
        type Product implements Item {
          id: ID!
        }
        type Query {
          item: Item
        }
      `,
      resolvers: {
        Query: { item: itemResolver },
      },
    });
    await request();
    expect(executedSelections[1]).toEqual(['id', '__typename']);
  });
});

describe('Disposal', () => {
  it('should dispose the client along with the gateway', async () => {
    const client = createHive({ enabled: false, token: 'dummy-token' });
    const clientDisposeSpy = vi.spyOn(client, 'dispose');
    const gw = createGatewayRuntime({
      supergraph: `type Query { ok: Boolean }`,
      plugins: () => [useHive(client)],
    });
    await gw.dispose();

    expect(clientDisposeSpy).toHaveBeenCalledOnce();
  });
});
