import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { ProjectManager } from './providers/project-manager';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const projectModule = createModule({
  id: 'project',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [ProjectManager, AuditLogManager],
});
