import { createModule } from 'graphql-modules';
import { GraphStore } from './providers/graph-store';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const graphModule = createModule({
  id: 'graph',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [GraphStore],
});
