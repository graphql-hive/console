import { createModule } from 'graphql-modules';
import { ClickHouse } from './providers/clickhouse-client';
import { GraphSelectorProvider } from './providers/graph-selector-provider';
import { OperationsManager } from './providers/operations-manager';
import { OperationsReader } from './providers/operations-reader';
import { Traces } from './providers/traces';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const operationsModule = createModule({
  id: 'operations',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [GraphSelectorProvider, OperationsManager, OperationsReader, ClickHouse, Traces],
});
