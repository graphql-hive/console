import { createModule } from 'graphql-modules';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const proposalsModule = createModule({
  id: 'proposals',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [],
  // providers: [TargetManager, TargetsByIdCache, TargetsBySlugCache],
});
