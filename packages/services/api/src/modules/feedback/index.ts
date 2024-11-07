import { createModule } from 'graphql-modules';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const feedbackModule = createModule({
  id: 'feedback',
  dirname: __dirname,
  typeDefs,
  resolvers,
});
