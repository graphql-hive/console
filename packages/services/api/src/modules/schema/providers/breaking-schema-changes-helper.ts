import { Injectable, Scope } from 'graphql-modules';
import type { ConditionalBreakingChangeMetadata, SchemaChangeType } from '@hive/storage';
import { formatNumber, formatPercentage } from '../lib/number-formatting';

/**
 * A class to avoid type mapping and drilling types by storing the data in a WeakMap instead...
 */
@Injectable({
  scope: Scope.Operation,
})
export class BreakingSchemaChangeUsageHelper {
  constructor() {}

  private breakingSchemaChangeToMetadataMap = new WeakMap<
    SchemaChangeType,
    ConditionalBreakingChangeMetadata
  >();

  registerMetadataForBreakingSchemaChange(
    schemaChange: SchemaChangeType,
    metadata: ConditionalBreakingChangeMetadata,
  ) {
    this.breakingSchemaChangeToMetadataMap.set(schemaChange, metadata);
  }

  async getUsageDataForBreakingSchemaChange(schemaChange: SchemaChangeType) {
    if (schemaChange.usageStatistics === null) {
      return null;
    }

    const metadata = this.breakingSchemaChangeToMetadataMap.get(schemaChange);

    if (metadata == null) {
      return null;
    }

    return {
      topAffectedOperations: schemaChange.usageStatistics.topAffectedOperations.map(operation => {
        // Note:
        // "metadata.usage.totalRequestCount" is sometimes 0/NaN in integration tests
        // due to ClickHouse eventual consistency lag.
        // We ensure the percentage is always a finite number to avoid GraphQL serialization errors.
        const totalRequestCount = Number.isFinite(metadata.usage.totalRequestCount)
          ? Math.max(1, metadata.usage.totalRequestCount)
          : 1;
        const count = Number.isFinite(operation.count) ? operation.count : 0;
        const percentage = (count / totalRequestCount) * 100;
        return {
          ...operation,
          percentage,
          targetIds: metadata.settings.targets.map(target => target.id),
        };
      }),
      topAffectedClients: schemaChange.usageStatistics.topAffectedClients.map(client => {
        // Note:
        // "metadata.usage.totalRequestCount" is sometimes 0/NaN in integration tests
        // due to ClickHouse eventual consistency lag.
        // We ensure the percentage is always a finite number to avoid GraphQL serialization errors.
        const totalRequestCount = Number.isFinite(metadata.usage.totalRequestCount)
          ? Math.max(1, metadata.usage.totalRequestCount)
          : 1;
        const count = Number.isFinite(client.count) ? client.count : 0;
        const percentage = (count / totalRequestCount) * 100;

        return {
          ...client,
          countFormatted: formatNumber(count),
          percentage,
          percentageFormatted: formatPercentage(percentage),
        };
      }),
    };
  }
}
