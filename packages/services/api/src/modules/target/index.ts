import { createModule } from 'graphql-modules';
import { TargetManager } from './providers/target-manager';
import { TargetsByIdCache } from './providers/targets-by-id-cache';
import { TargetsBySlugCache } from './providers/targets-by-slug-cache';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const targetModule = createModule({
  id: 'target',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [TargetManager, TargetsByIdCache, TargetsBySlugCache],
});
