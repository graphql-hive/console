import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { ClickHouse } from '../operations/providers/clickhouse-client';
import { OrganizationManager } from './providers/organization-manager';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const organizationModule = createModule({
  id: 'organization',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [OrganizationManager, AuditLogManager, ClickHouse],
});
