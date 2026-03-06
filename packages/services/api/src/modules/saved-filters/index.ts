import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { SavedFiltersStorage } from './providers/saved-filters-storage';
import { SavedFiltersProvider } from './providers/saved-filters.provider';
import { resolvers } from './resolvers.generated';
import { typeDefs } from './module.graphql';

export const savedFiltersModule = createModule({
  id: 'saved-filters',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [SavedFiltersProvider, SavedFiltersStorage, AuditLogManager],
});
