/**
 * Computes the list of changes between two schemas.
 *
 * This module is free of graphql-modules providers and database access, as it is shared by the API
 * and the schema service (which runs it in a worker thread). Classifying changes based on usage data,
 * app deployments and approvals stays in the API (`RegistryChecks.diff`).
 */
import {
  DefinitionNode,
  DocumentNode,
  GraphQLSchema,
  isTypeDefinitionNode,
  isTypeExtensionNode,
  Kind,
  visit,
} from 'graphql';
import {
  Change,
  ChangeType,
  diff,
  DiffRule,
  Rule,
  TypeOfChangeType,
} from '@graphql-inspector/core';
import { HiveSchemaChangeModel, type SchemaChangeType } from '@hive/storage/schema-change-model';
import { parseSchemaSDL } from '../../../shared/entities';
import { buildSortedSchemaFromSchemaObject } from '../../../shared/schema';

export type SchemaDiffInput = {
  existingSdl: string;
  incomingSdl: string;
  /**
   * `composed`: a composed (public API or supergraph) schema.
   * `service`: the SDL of a single service, which can extend types it does not define.
   */
  source: 'composed' | 'service';
  /**
   * Set to true to reduce the number of changes to only what's relevant to the user.
   * Use false for schema proposals in order to capture every single change record for the patch function.
   */
  filterNestedChanges: boolean;
  /** Whether Federation directive related changes should be filtered out from the list of changes. */
  filterOutFederationChanges: boolean;
};

export type SchemaDiffOutcome =
  | {
      /** One of the schemas could not be built. */
      status: 'skipped';
    }
  | {
      status: 'completed';
      changes: SchemaChangeType[];
    };

export async function computeSchemaChanges(
  input: SchemaDiffInput,
  options: {
    /** Defaults to `parseSchemaSDL`. Lets the API reuse documents it already parsed. */
    parse?: (sdl: string) => DocumentNode;
    /** Defaults to `diffSchemas`. Lets the API trace the diff. */
    diff?: (
      existing: GraphQLSchema,
      incoming: GraphQLSchema,
      rules: Rule[],
    ) => Promise<SchemaChangeType[]>;
  } = {},
): Promise<SchemaDiffOutcome> {
  const parse = options.parse ?? parseSchemaSDL;
  const diffFn = options.diff ?? diffSchemas;

  const buildSchema = (sdl: string) => {
    let document = parse(sdl);
    if (input.source === 'service') {
      document = addTypeForExtensions(document);
    }
    return buildSortedSchemaFromSchemaObject({ document });
  };

  let existingSchema: GraphQLSchema;
  let incomingSchema: GraphQLSchema;

  try {
    existingSchema = buildSchema(input.existingSdl);
    incomingSchema = buildSchema(input.incomingSdl);
  } catch {
    return { status: 'skipped' };
  }

  let changes = await diffFn(
    existingSchema,
    incomingSchema,
    input.filterNestedChanges ? [DiffRule.simplifyChanges] : [],
  );

  // Federation specific changes are not relevant for the schema diff and were in previous schema versions by accident.
  if (input.filterOutFederationChanges) {
    changes = changes.filter(change => !isFederationRelatedChange(change));
  }

  return { status: 'completed', changes };
}

export async function diffSchemas(
  existing: GraphQLSchema,
  incoming: GraphQLSchema,
  rules?: Rule[],
): Promise<SchemaChangeType[]> {
  const rawChanges = await diff(existing, incoming, rules);

  const changes: SchemaChangeType[] = [];

  for (const change of rawChanges) {
    if (shouldDropChange(change)) {
      continue;
    }

    changes.push(
      HiveSchemaChangeModel.parse({
        type: change.type,
        meta: change.meta,
        isSafeBasedOnUsage: change.criticality.isSafeBasedOnUsage,
      }),
    );
  }

  return changes;
}

/**
 * The form in which a change is sent over the wire (and stored in the database).
 * `HiveSchemaChangeModel.parse` restores the computed properties.
 */
export type SerializedSchemaChange = {
  id: string;
  type: string;
  meta: SchemaChangeType['meta'];
  isSafeBasedOnUsage: boolean;
};

export function serializeSchemaChange(change: SchemaChangeType): SerializedSchemaChange {
  return {
    id: change.id,
    type: change.type,
    meta: change.meta,
    isSafeBasedOnUsage: change.isSafeBasedOnUsage,
  };
}

export function deserializeSchemaChange(change: SerializedSchemaChange): SchemaChangeType {
  return HiveSchemaChangeModel.parse(change);
}

const federationTypes = new Set([
  'join__FieldSet',
  'join__Graph',
  'link__Import',
  'link__Purpose',
  'core__Purpose',
  'policy__Policy',
  'requiresScopes__Scope',
  'join__DirectiveArguments',
]);
const federationDirectives = new Set([
  '@join__enumValue',
  '@join__field',
  '@join__graph',
  '@join__implements',
  '@join__type',
  '@join__owner',
  '@join__unionMember',
  '@link',
  '@federation__inaccessible',
  '@inaccessible',
  '@tag',
  '@core',
  '@federation__tag',
]);

export function isFederationRelatedChange(change: SchemaChangeType) {
  return change.path && (federationTypes.has(change.path) || federationDirectives.has(change.path));
}

const extensionToDefinitionKindMap = {
  [Kind.OBJECT_TYPE_EXTENSION]: Kind.OBJECT_TYPE_DEFINITION,
  [Kind.INPUT_OBJECT_TYPE_EXTENSION]: Kind.INPUT_OBJECT_TYPE_DEFINITION,
  [Kind.INTERFACE_TYPE_EXTENSION]: Kind.INTERFACE_TYPE_DEFINITION,
  [Kind.UNION_TYPE_EXTENSION]: Kind.UNION_TYPE_DEFINITION,
  [Kind.ENUM_TYPE_EXTENSION]: Kind.ENUM_TYPE_DEFINITION,
  [Kind.SCALAR_TYPE_EXTENSION]: Kind.SCALAR_TYPE_DEFINITION,
} as const;

/**
 * Adds an empty type definition for every type that is only extended,
 * as a schema can not be built from an extension alone.
 */
export function addTypeForExtensions(ast: DocumentNode) {
  const trackTypeDefs = new Map<
    string,
    | {
        state: 'TYPE_ONLY';
      }
    | {
        state: 'EXTENSION_ONLY' | 'VALID_EXTENSION';
        kind:
          | Kind.OBJECT_TYPE_EXTENSION
          | Kind.ENUM_TYPE_EXTENSION
          | Kind.UNION_TYPE_EXTENSION
          | Kind.SCALAR_TYPE_EXTENSION
          | Kind.INTERFACE_TYPE_EXTENSION
          | Kind.INPUT_OBJECT_TYPE_EXTENSION;
      }
  >();
  for (const node of ast.definitions) {
    if ('name' in node && node.name) {
      const name = node.name.value;
      const entry = trackTypeDefs.get(name);
      if (isTypeExtensionNode(node)) {
        if (!entry) {
          trackTypeDefs.set(name, { state: 'EXTENSION_ONLY', kind: node.kind });
        } else if (entry.state === 'TYPE_ONLY') {
          trackTypeDefs.set(name, { kind: node.kind, state: 'VALID_EXTENSION' });
        }
      } else if (isTypeDefinitionNode(node)) {
        if (!entry) {
          trackTypeDefs.set(name, { state: 'TYPE_ONLY' });
        } else if (entry.state === 'EXTENSION_ONLY') {
          trackTypeDefs.set(name, { ...entry, state: 'VALID_EXTENSION' });
        }
      }
    }
  }

  const astCopy = visit(ast, {});
  for (const [name, entry] of trackTypeDefs) {
    if (entry.state === 'EXTENSION_ONLY') {
      (astCopy.definitions as DefinitionNode[]).push({
        kind: extensionToDefinitionKindMap[entry.kind],
        name: {
          kind: Kind.NAME,
          value: name,
        },
      });
    }
  }
  return astCopy;
}

/**
 * In case of <any>DescriptionChanged change, it normalizes the before and after descriptions and compares them.
 * If they are equal, it means that the change is no longer relevant and can be dropped.
 * All other changes are kept.
 */
function shouldDropChange(change: Change<TypeOfChangeType>): boolean {
  return (
    matchChange(change, {
      [ChangeType.DirectiveArgumentDescriptionChanged]: change =>
        isDescriptionUnchangedAfterTrim(
          change,
          'newDirectiveArgumentDescription',
          'oldDirectiveArgumentDescription',
        ),
      [ChangeType.DirectiveDescriptionChanged]: change => {
        return isDescriptionUnchangedAfterTrim(
          change,
          'oldDirectiveDescription',
          'newDirectiveDescription',
        );
      },
      [ChangeType.EnumValueDescriptionChanged]: change =>
        isDescriptionUnchangedAfterTrim(
          change,
          'oldEnumValueDescription',
          'newEnumValueDescription',
        ),
      [ChangeType.FieldArgumentDescriptionChanged]: change => {
        return isDescriptionUnchangedAfterTrim(change, 'newDescription', 'oldDescription');
      },
      [ChangeType.FieldDescriptionChanged]: change => {
        return isDescriptionUnchangedAfterTrim(change, 'newDescription', 'oldDescription');
      },
      [ChangeType.InputFieldDescriptionChanged]: change => {
        return isDescriptionUnchangedAfterTrim(
          change,
          'newInputFieldDescription',
          'oldInputFieldDescription',
        );
      },
      [ChangeType.TypeDescriptionChanged]: change => {
        return isDescriptionUnchangedAfterTrim(change, 'newTypeDescription', 'oldTypeDescription');
      },
    }) ?? false
  );
}

function trimDescription(description: unknown): string {
  if (typeof description !== 'string') {
    return '';
  }

  return description.trim();
}

// Limits the name of properties to only those that ends with Description
type PropEndsWith<T, E extends string> = T extends `${any}${E}` ? T : never;

function isDescriptionUnchangedAfterTrim<
  T extends TypeOfChangeType,
  TO extends PropEndsWith<keyof Change<T>['meta'], 'Description'>,
  // Prevents comparing values of the same key (e.g. newDescription, newDescription will result in TS error)
  TN extends Exclude<PropEndsWith<keyof Change<T>['meta'], 'Description'>, TO>,
>(change: Change<T>, oldKey: TO, newKey: TN) {
  return trimDescription(change.meta[oldKey]) === trimDescription(change.meta[newKey]);
}

function matchChange<R, T extends TypeOfChangeType>(
  change: Change<T>,
  pattern: {
    [K in T]?: (change: Change<K>) => R;
  },
) {
  if (change.type in pattern) {
    return pattern[change.type]?.(change);
  }
}
