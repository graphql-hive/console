import { createModule } from 'graphql-modules';
import { GraphStore } from './providers/graph-store';
import typeDefs from './module.graphql';

export const graphModule = createModule({
  id: 'graph',
  dirname: __dirname,
  typeDefs,
  providers: [GraphStore],
});
