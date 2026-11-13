import type { SchemaChangeMapper } from '../module.graphql.mappers';
import { ChangeType } from '@graphql-inspector/core';

type InspectorChangeType = (typeof ChangeType)[keyof typeof ChangeType];

/**
 * Changes whose coordinate is one the usage collector reports usage for: a field, an argument, an
 * input field or an enum value (packages/libraries/core/src/client/collect-schema-coordinates.ts).
 * An added argument is counted on its field, which is recorded for every selection. Every change
 * has a coordinate; for the others, usage is never recorded under it.
 */
const TRACKED = new Set<InspectorChangeType>([
  ChangeType.FieldRemoved,
  ChangeType.FieldTypeChanged,
  ChangeType.FieldArgumentAdded,
  ChangeType.FieldArgumentRemoved,
  ChangeType.FieldArgumentTypeChanged,
  ChangeType.InputFieldRemoved,
  ChangeType.InputFieldTypeChanged,
  ChangeType.EnumValueRemoved,
]);

/**
 * Whether a change's "safe based on usage" can be trusted. Types, union members, interfaces and
 * directives are never recorded, and an input field that did not exist yet cannot have been sent.
 * Only meaningful for breaking changes and for dangerous changes the target fails on.
 */
export function isSchemaChangeUsageTracked(
  change: Pick<SchemaChangeMapper, 'type' | 'path' | 'breakingChangeSchemaCoordinate'>,
): boolean {
  if ((change.breakingChangeSchemaCoordinate ?? change.path) == null) {
    return false;
  }
  return TRACKED.has(change.type as InspectorChangeType);
}
