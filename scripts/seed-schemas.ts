/**
 * Example:
 * `TARGET=<target_id> FEDERATION=1 STAGE=local TOKEN=<access_token> pnpm seed:schemas`
 */
import { parse as parsePath } from 'path';
import { printSchema } from 'graphql';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadSchema, loadTypedefs } from '@graphql-tools/load';

const token = process.env.TOKEN || process.env.HIVE_TOKEN;

if (!token) {
  throw new Error('Missing "TOKEN"');
}

const target = process.env.TARGET;
const isFederation = process.env.FEDERATION === '1';
const stage = process.env.STAGE || 'local';

let graphqlEndpoint: string;
let environment: string;
switch (stage.toLowerCase()) {
  case 'staging': {
    graphqlEndpoint = 'https://app.hiveready.dev/graphql';
    environment = 'staging';
    break;
  }
  case 'dev': {
    graphqlEndpoint = 'https://app.buzzcheck.dev/graphql';
    environment = 'dev';
    break;
  }
  default: {
    graphqlEndpoint = 'http://localhost:3001/graphql';
    environment = 'local';
  }
}

console.log(`
  Environment:               ${environment}
  Hive GraphQL endpoint:     ${graphqlEndpoint}
  Schema type:               ${isFederation ? 'federation' : 'single'}
`);

const publishMutationDocument =
  /* GraphQL */
  `
    mutation schemaPublish($input: SchemaPublishInput!) {
      schemaPublish(input: $input) {
        __typename
        ... on SchemaPublishSuccess {
          initial
          valid
          message
          linkToWebsite
          changes {
            nodes {
              message
              criticality
            }
            total
          }
        }
        ... on SchemaPublishError {
          valid
          linkToWebsite
          changes {
            nodes {
              message
              criticality
            }
            total
          }
          errors {
            nodes {
              message
            }
            total
          }
        }
      }
    }
  `;

async function publishSchema(args: { sdl: string; service?: string; target?: string }) {
  let res = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: publishMutationDocument,
      variables: {
        input: {
          author: 'MoneyBoy',
          commit: '1977',
          sdl: args.sdl,
          service: args.service,
          url: `https://${args.service ? `${args.service}.` : ''}localhost/graphql`,
          target: args.target ? { byId: args.target } : null,
        },
      },
    }),
  }).then(res => res.json());
  console.log(JSON.stringify(res, null, 2));
}

async function single() {
  const schema = await loadSchema('scripts/seed-schemas/mono.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const sdl = printSchema(schema);
  return publishSchema({
    sdl,
    target,
  });
}

async function federation() {
  const schemaDocs = await loadTypedefs('scripts/seed-schemas/federated/*.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const uploads = schemaDocs
    .map(d => {
      if (!d.rawSDL) {
        console.error(`Missing SDL at "${d.location}"`);
        return null;
      }
      const service = d.location ? parsePath(d.location).name.replaceAll('.', '-') : undefined;

      return publishSchema({
        sdl: d.rawSDL,
        service,
        target,
      });
    })
    .filter(Boolean);

  await Promise.all(uploads);
  // await instance.info();
}

if (isFederation === false) {
  await single();
} else {
  await federation();
}
