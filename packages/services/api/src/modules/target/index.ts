import { createModule } from 'graphql-modules';
import { TargetManager } from './providers/target-manager';
import { TargetsCache } from './providers/targets-cache';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const targetModule = createModule({
  id: 'target',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [TargetManager, TargetsCache],
});
