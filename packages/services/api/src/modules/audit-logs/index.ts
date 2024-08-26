import { createModule } from 'graphql-modules';
import { ClickHouse } from '../operations/providers/clickhouse-client';
import { AuditLogRecorder } from './providers/audit-log-recorder';
import { AuditLogManager } from './providers/audit-logs-manager';
import { resolvers } from './resolvers.generated';
import { typeDefs } from './module.graphql';

export const auditLogsModule = createModule({
  id: 'audit-logs',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [AuditLogManager, AuditLogRecorder, ClickHouse],
});
