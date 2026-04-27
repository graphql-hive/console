import { createModule } from 'graphql-modules';
import { SavedFiltersStorage } from '../saved-filters/providers/saved-filters-storage';
import { TeamsCommunicationAdapter } from './providers/adapters/msteams';
import { SlackCommunicationAdapter } from './providers/adapters/slack';
import { WebhookCommunicationAdapter } from './providers/adapters/webhook';
import { AlertsManager } from './providers/alerts-manager';
import { MetricAlertRulesStorage } from './providers/metric-alert-rules-storage';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const alertsModule = createModule({
  id: 'alerts',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [
    AlertsManager,
    MetricAlertRulesStorage,
    SavedFiltersStorage,
    SlackCommunicationAdapter,
    WebhookCommunicationAdapter,
    TeamsCommunicationAdapter,
  ],
});
