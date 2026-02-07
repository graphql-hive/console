import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { typeDefs } from './module.graphql';
import { SavedFiltersProvider } from './providers/saved-filters.provider';
import { resolvers } from './resolvers.generated';

export const savedFiltersModule = createModule({
  id: 'saved-filters',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [SavedFiltersProvider, AuditLogManager],
});
