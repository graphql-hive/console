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
