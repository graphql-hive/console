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
        // "metadata.usage.totalRequestCount" is sometimes 0 in case of a integration test
        // causing a zero devision and GraphQL exception,
        // because we aggressively poll for the schema change after publishing usage data
        // it seems like clickhouse slighty lags behind for the materialized view here.
        // since it only happens in contetx of an integration test (no production issues)
        // we can safely treat 0 as 1 request.
        const totalRequestCount = Math.max(1, metadata.usage.totalRequestCount);
        const percentage = (operation.count / totalRequestCount) * 100;
        return {
          ...operation,
          percentage,
          targetIds: metadata.settings.targets.map(target => target.id),
        };
      }),
      topAffectedClients: schemaChange.usageStatistics.topAffectedClients.map(client => {
        // Note:
        // "metadata.usage.totalRequestCount" is sometimes 0 in case of a integration test
        // causing a zero devision and GraphQL exception,
        // because we aggressively poll for the schema change after publishing usage data
        // it seems like clickhouse slighty lags behind for the materialized view here.
        // since it only happens in contetx of an integration test (no production issues)
        // we can safely treat 0 as 1 request.
        const totalRequestCount = Math.max(1, metadata.usage.totalRequestCount);
        const percentage = (client.count / totalRequestCount) * 100;

        return {
          ...client,
          countFormatted: formatNumber(client.count),
          percentage,
          percentageFormatted: formatPercentage(percentage),
        };
      }),
    };
  }
}
