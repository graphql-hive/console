import { parse, print } from 'graphql';
import { addIdSelectionDocumentTransform } from './codegen-add-id-selection';

const schema = parse(/* GraphQL */ `
  interface Node {
    id: ID!
  }
  type Project implements Node {
    id: ID!
    slug: String!
    owner: Owner!
    stats: Stats!
  }
  type Owner implements Node {
    id: ID!
    name: String!
  }
  type Stats {
    total: Int!
  }
  type Query {
    project: Project
    node: Node
  }
`);

async function transform(source: string) {
  const [result] = await addIdSelectionDocumentTransform.transform({
    documents: [{ document: parse(source) }],
    schema,
    config: {},
  });
  return print(result.document!);
}

test('adds id only to selections that do not already get one', async () => {
  await expect(
    transform(/* GraphQL */ `
      fragment WithId on Project {
        id
      }
      query Q {
        missing: project {
          slug
          owner {
            name
          }
          stats {
            total
          }
        }
        direct: project {
          id
        }
        spread: project {
          ...WithId
        }
        aliased: project {
          key: id
        }
        node {
          id
          ... on Project {
            slug
          }
        }
      }
    `),
  ).resolves.toMatchInlineSnapshot(`
    fragment WithId on Project {
      id
    }

    query Q {
      missing: project {
        id
        slug
        owner {
          id
          name
        }
        stats {
          total
        }
      }
      direct: project {
        id
      }
      spread: project {
        ...WithId
      }
      aliased: project {
        id
        key: id
      }
      node {
        id
        ... on Project {
          slug
        }
      }
    }
  `);
});
