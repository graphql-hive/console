/**
 * Example:
 * `TARGET=<target_id> FEDERATION=1 STAGE=local TOKEN=<access_token> pnpm seed:usage`
 */
import { parse as parsePath } from 'path';
import { buildSchema, DocumentNode, GraphQLSchema, parse, print } from 'graphql';
import { createHive, HiveClient } from '@graphql-hive/core';
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
import { loadDocuments, loadSchema, loadTypedefs } from '@graphql-tools/load';
import {
  composeServices,
  ServiceDefinition,
  transformSupergraphToPublicSchema,
} from '@theguild/federation-composition';

const token = process.env.TOKEN || process.env.HIVE_TOKEN;
if (!token) {
  throw new Error('Missing "TOKEN"');
}

const target = process.env.TARGET;
const isFederation = process.env.FEDERATION === '1';
const stage = process.env.STAGE || 'local';
const batches = parseInt(process.env.BATCHES || '10', 10) || 10;
const operationsPerBatch = parseInt(process.env.OPERATIONS || '10', 10) || 10;
const interval = parseInt(process.env.INTERVAL || '1000') || 1000;

let usageReportingEndpoint: string;
let environment: string;
switch (stage.toLowerCase()) {
  case 'staging': {
    usageReportingEndpoint = 'https://app.hiveready.dev/usage';
    environment = 'staging';
    break;
  }
  case 'dev': {
    usageReportingEndpoint = 'https://app.buzzcheck.dev/usage';
    environment = 'dev';
    break;
  }
  default: {
    usageReportingEndpoint = 'http://localhost:4001';
    environment = 'local';
  }
}

console.log(`
  Environment:                ${environment}
  Usage reporting endpoint:   ${usageReportingEndpoint}
`);

const createInstance = () => {
  return createHive({
    token,
    agent: {
      name: 'Hive Seed Script',
      maxSize: 10,
    },
    debug: true,
    enabled: true,
    usage: {
      target: target || undefined,
      clientInfo: () => ({
        // @todo create multiple clients with different versions and/or names
        name: 'Fake Hive Client',
        version: '1.1.1',
      }),
      endpoint: usageReportingEndpoint,
      max: 10,
      sampleRate: 1,
    },
  });
};

/**
 * Not very precise, but provides enough randomization to weight the queries reasonably well.
 */
const chooseQuery = (queries: DocumentNode[]) => {
  for (let i = 0; i < queries.length; i++) {
    const randNumber = Math.random() * 100;
    if (randNumber <= 25) {
      return queries[i];
    }
  }
  return queries[queries.length - 1];
};

function start(args: { instance: HiveClient; schema: GraphQLSchema; queries: DocumentNode[] }) {
  let sentBatches = 0;
  let intervalId: NodeJS.Timeout | null = setInterval(async () => {
    if (sentBatches >= batches) {
      console.log('Done.');
      if (!!intervalId) {
        clearInterval(intervalId);
        await args.instance.dispose();
      }
      intervalId = null;
      return;
    }
    sentBatches++;
    for (let i = 0; i < operationsPerBatch; i++) {
      const randNumber = Math.random() * 100;
      const done = args.instance.collectUsage();

      await done(
        {
          document: chooseQuery(args.queries),
          schema: args.schema,
          variableValues: {},
          contextValue: {},
        },
        randNumber > 95
          ? {
              errors: undefined,
            }
          : {
              errors: [{ message: 'oops' }],
            },
      );
    }
  }, interval);
}

const instance = createInstance();
await instance.info();
if (isFederation === false) {
  const schema = await loadSchema('scripts/seed-schemas/mono.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const documents = await loadDocuments('scripts/seed-usage/mono/*.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const queries = documents.map(({ document }) => {
    if (!document) {
      throw new Error('Unexpected error. Could not find document.');
    }
    return document;
  });
  start({ instance, schema, queries });
} else {
  const schemaDocs = await loadTypedefs('scripts/seed-schemas/federated/*.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const services = schemaDocs.map((d): ServiceDefinition => {
    if (!d.rawSDL) {
      throw new Error(`Missing SDL at "${d.location}"`);
    }
    if (!d.location) {
      throw new Error(`Unexpected error. Missing "location".`);
    }
    const service = parsePath(d.location).name.replaceAll('.', '-');

    return {
      typeDefs: parse(d.rawSDL),
      name: service,
      url: `https://${service ? `${service}.` : ''}localhost/graphql`,
    };
  });

  const { supergraphSdl, errors } = composeServices(services);
  if (errors) {
    throw new Error(`Could not compose:\n - ${errors.map(e => e.message).join('\n - ')}`);
  }
  const apiSchema = print(transformSupergraphToPublicSchema(parse(supergraphSdl)));
  const documents = await loadDocuments('scripts/seed-usage/federated/*.graphql', {
    loaders: [new GraphQLFileLoader()],
  });
  const queries = documents.map(({ document }) => {
    if (!document) {
      throw new Error('Unexpected error. Could not find document.');
    }
    return document;
  });
  start({ instance, schema: buildSchema(apiSchema), queries });
}
