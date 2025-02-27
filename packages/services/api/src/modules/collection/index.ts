import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { CollectionProvider } from './providers/collection.provider';
import { resolvers } from './resolvers.generated';
import { typeDefs } from './module.graphql';

export const collectionModule = createModule({
  id: 'collection',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [CollectionProvider, AuditLogManager],
});
