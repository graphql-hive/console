import { Kind } from 'graphql';
import type { SchemaExplorerTypeEntity } from '@hive/schema-explorer-snapshot';

/**
 * Removes the schema coordinates that were used, keeping only the unused parts of each type.
 * Coordinates: `Type`, `Type.field`, `Type.field.argument` and `InputType.field`.
 *
 * - A used field is only removed once none of its arguments are left, as an unused argument
 *   keeps its field.
 * - Object, interface and input object types are removed once no fields are left.
 * - Scalars, enums and unions are kept or removed as a whole; enum values and union members are
 *   not filtered.
 */
export function onlyUnusedTypes(
  types: ReadonlyArray<SchemaExplorerTypeEntity>,
  usedCoordinates: ReadonlySet<string>,
): Array<SchemaExplorerTypeEntity> {
  const result: Array<SchemaExplorerTypeEntity> = [];

  for (const type of types) {
    switch (type.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_DEFINITION: {
        const fields = type.fields
          .map(field => ({
            ...field,
            args: field.args.filter(
              arg => !usedCoordinates.has(`${type.name}.${field.name}.${arg.name}`),
            ),
          }))
          .filter(
            field => field.args.length > 0 || !usedCoordinates.has(`${type.name}.${field.name}`),
          );
        if (fields.length > 0) {
          result.push({ ...type, fields });
        }
        break;
      }
      case Kind.INPUT_OBJECT_TYPE_DEFINITION: {
        const fields = type.fields.filter(
          field => !usedCoordinates.has(`${type.name}.${field.name}`),
        );
        if (fields.length > 0) {
          result.push({ ...type, fields });
        }
        break;
      }
      case Kind.SCALAR_TYPE_DEFINITION:
      case Kind.ENUM_TYPE_DEFINITION:
      case Kind.UNION_TYPE_DEFINITION:
        if (!usedCoordinates.has(type.name)) {
          result.push(type);
        }
        break;
    }
  }

  return result;
}

/**
 * Keeps only the deprecated parts of each type.
 *
 * - A field is kept if it or one of its arguments is deprecated; only its deprecated arguments
 *   are kept.
 * - Object, interface and input object types are removed once no fields are left.
 * - Enums are kept whole (all values) if one of their values is deprecated.
 * - Scalars and unions are removed, as they cannot be deprecated.
 */
export function onlyDeprecatedTypes(
  types: ReadonlyArray<SchemaExplorerTypeEntity>,
): Array<SchemaExplorerTypeEntity> {
  const result: Array<SchemaExplorerTypeEntity> = [];
  const isDeprecated = (entity: { deprecationReason?: string | null }) =>
    entity.deprecationReason != null;

  for (const type of types) {
    switch (type.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_DEFINITION: {
        const fields = type.fields
          .map(field => ({ ...field, args: field.args.filter(isDeprecated) }))
          .filter(field => isDeprecated(field) || field.args.length > 0);
        if (fields.length > 0) {
          result.push({ ...type, fields });
        }
        break;
      }
      case Kind.INPUT_OBJECT_TYPE_DEFINITION: {
        const fields = type.fields.filter(isDeprecated);
        if (fields.length > 0) {
          result.push({ ...type, fields });
        }
        break;
      }
      case Kind.ENUM_TYPE_DEFINITION:
        if (type.values.some(isDeprecated)) {
          result.push(type);
        }
        break;
    }
  }

  return result;
}
