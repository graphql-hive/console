import { createModule } from 'graphql-modules';
import { ResourceAssignments } from '../organization/providers/resource-assignments';
import { OIDCIntegrationStore } from './providers/oidc-integration.store';
import { OIDCIntegrationsProvider } from './providers/oidc-integrations.provider';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const oidcIntegrationsModule = createModule({
  id: 'oidc-integrations',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [OIDCIntegrationsProvider, ResourceAssignments, OIDCIntegrationStore],
});
