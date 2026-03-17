/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Reason: this script is executed directly via `node --experimental-strip-types`
// which allows running `.ts` files without transpilation. TypeScript doesn’t
// allow `.ts` import specifiers unless `allowImportingTsExtensions` is enabled,
// which we don’t want globally. Disabling type checking here avoids TS5097
// while keeping the rest of the project strict.
import { writeFileSync } from 'node:fs';
import { assertCompositionSuccess, composeServices } from '@theguild/federation-composition';
import { typeDefs as productsTypeDefs, yoga as yogaProducts } from './products.ts';
import { typeDefs as reviewsTypeDefs, yoga as yogaReviews } from './reviews.ts';
import { typeDefs as usersTypeDefs, yoga as yogaUsers } from './users.ts';

function buildFullEndpoint(endpoint: string) {
  return `https://federation-demo.theguild.workers.dev${endpoint}`;
}

function buildName(endpoint: string) {
  return endpoint.replace('/', '');
}

const result = composeServices([
  {
    name: buildName(yogaUsers.graphqlEndpoint),
    url: buildFullEndpoint(yogaUsers.graphqlEndpoint),
    typeDefs: usersTypeDefs,
  },
  {
    name: buildName(yogaProducts.graphqlEndpoint),
    url: buildFullEndpoint(yogaProducts.graphqlEndpoint),
    typeDefs: productsTypeDefs,
  },
  {
    name: buildName(yogaReviews.graphqlEndpoint),
    url: buildFullEndpoint(yogaReviews.graphqlEndpoint),
    typeDefs: reviewsTypeDefs,
  },
]);

assertCompositionSuccess(result, 'Failed to compose subgraphs');

writeFileSync('./public/supergraph.graphql', result.supergraphSdl, 'utf-8');
