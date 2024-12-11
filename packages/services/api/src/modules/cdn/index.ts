import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { ClickHouse } from '../operations/providers/clickhouse-client';
import { CdnProvider } from './providers/cdn.provider';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const cdnModule = createModule({
  id: 'cdn',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [CdnProvider, AuditLogManager, ClickHouse],
});
