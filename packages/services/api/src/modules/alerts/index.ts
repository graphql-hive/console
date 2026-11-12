import { createModule } from 'graphql-modules';
import { DeliveryReader } from '../deliveries/providers/delivery-reader';
import { ClickHouse } from '../operations/providers/clickhouse-client';
import { SavedFiltersStorage } from '../saved-filters/providers/saved-filters-storage';
import { DiscordCommunicationAdapter } from './providers/adapters/discord';
import { TeamsCommunicationAdapter } from './providers/adapters/msteams';
import { SlackCommunicationAdapter } from './providers/adapters/slack';
import { WebhookCommunicationAdapter } from './providers/adapters/webhook';
import { AlertChannelsStorage } from './providers/alert-channels-storage';
import { AlertsManager } from './providers/alerts-manager';
import { DeliveryRecorder } from './providers/delivery-recorder';
import { MetricAlertRulesManager } from './providers/metric-alert-rules-manager';
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
    AlertChannelsStorage,
    MetricAlertRulesManager,
    MetricAlertRulesStorage,
    SavedFiltersStorage,
    SlackCommunicationAdapter,
    WebhookCommunicationAdapter,
    TeamsCommunicationAdapter,
    DiscordCommunicationAdapter,
    DeliveryRecorder,
    DeliveryReader,
    ClickHouse,
  ],
});
