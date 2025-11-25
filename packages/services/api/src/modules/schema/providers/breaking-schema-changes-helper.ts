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
        let percentage = (operation.count / metadata.usage.totalRequestCount) * 100;
        if (percentage === Infinity) {
          percentage = 0;
        }

        return {
          ...operation,
          percentage,
          targetIds: metadata.settings.targets.map(target => target.id),
        };
      }),
      topAffectedClients: schemaChange.usageStatistics.topAffectedClients.map(client => {
        let percentage = (client.count / metadata.usage.totalRequestCount) * 100;
        if (percentage === Infinity) {
          percentage = 0;
        }

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
