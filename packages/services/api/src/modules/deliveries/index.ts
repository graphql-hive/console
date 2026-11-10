import { createModule } from 'graphql-modules';
import { ClickHouse } from '../operations/providers/clickhouse-client';
import { DeliveryReader } from './providers/delivery-reader';
import { EmailDeliveries } from './providers/email-deliveries';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const deliveriesModule = createModule({
  id: 'deliveries',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [EmailDeliveries, DeliveryReader, ClickHouse],
});
