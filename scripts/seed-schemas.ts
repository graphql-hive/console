/**
 * Example:
 * `TARGET=<target_id> FEDERATION=1 STAGE=local TOKEN=<access_token> pnpm seed:schemas`
 *
 * Where
 * - <target_id> = target's Resource ID
 * - <access_token> = An Access Token (obtained from Organization's Settings page)
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
  const response = await fetch(graphqlEndpoint, {
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
  return response as {
    data: {
      schemaPublish: {
        valid: boolean;
      } | null;
    } | null;
    errors?: any[];
  };
}

async function single() {
  const schema = await loadSchema('scripts/seed-schemas/mono.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const sdl = printSchema(schema);
  const result = await publishSchema({
    sdl,
    target,
  });
  if (result?.errors || result?.data?.schemaPublish?.valid !== true) {
    console.error(`Published schema is invalid.`);
  } else {
    console.log(`Published successfully.`);
  }
  return result;
}

async function federation() {
  const schemaDocs = await loadTypedefs('scripts/seed-schemas/federated/*.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const uploads = schemaDocs
    .map(async d => {
      if (!d.rawSDL) {
        console.error(`Missing SDL at "${d.location}"`);
        return null;
      }
      const service = d.location ? parsePath(d.location).name.replaceAll('.', '-') : undefined;

      const result = await publishSchema({
        sdl: d.rawSDL,
        service,
        target,
      });

      if (result?.errors || result?.data?.schemaPublish?.valid !== true) {
        console.error(`Published schema is invalid for "${service}".`);
      } else {
        console.log(`Published "${service}" successfully.`);
      }

      return result;
    })
    .filter(Boolean);

  return Promise.all(uploads);
}

if (isFederation === false) {
  await single();
} else {
  await federation();
}
