import {
  getNamedType,
  isInterfaceType,
  isObjectType,
  isUnionType,
  OperationTypeNode,
  type GraphQLField,
  type GraphQLInterfaceType,
  type GraphQLNamedType,
  type GraphQLObjectType,
  type GraphQLSchema,
  type GraphQLUnionType,
} from 'graphql';

/**
 * Builder rows address a schema location by a dotted path from an operation root
 * (`query.me.id`). A field inside an inline fragment needs the type condition in
 * that path too, or two possible types that share a field name are the same path.
 *
 * A colon cannot appear in a GraphQL Name, so an encoded segment can never collide
 * with a field, and it carries no dot, so the callers that derive ancestry by
 * slicing at every dot keep treating it as one ordinary level.
 */
const TYPE_CONDITION_PREFIX = 'on:';

export type SchemaPathSegment =
  | { kind: 'field'; name: string }
  | { kind: 'typeCondition'; typeName: string };

/** A type a path can be positioned on and still have somewhere to go. */
export type SchemaPathParentType = GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType;

export type SchemaPathStep = {
  segment: SchemaPathSegment;
  /** The type the segment was resolved against. */
  parentType: SchemaPathParentType;
  /** null on a type-condition step, which narrows rather than selects. */
  field: GraphQLField<unknown, unknown> | null;
  /** The named type the path sits on after this step. */
  type: GraphQLNamedType;
};

export function encodeTypeConditionSegment(typeName: string): string {
  return `${TYPE_CONDITION_PREFIX}${typeName}`;
}

/** Returns the type name, or null when the segment is an ordinary field. */
export function decodeTypeConditionSegment(segment: string): string | null {
  if (!segment.startsWith(TYPE_CONDITION_PREFIX)) {
    return null;
  }

  return segment.slice(TYPE_CONDITION_PREFIX.length) || null;
}

export function isTypeConditionSegment(segment: string): boolean {
  return decodeTypeConditionSegment(segment) !== null;
}

const toSegment = (segment: string): SchemaPathSegment => {
  const typeName = decodeTypeConditionSegment(segment);

  return typeName === null ? { kind: 'field', name: segment } : { kind: 'typeCondition', typeName };
};

const toOperation = (segment: string | undefined): OperationTypeNode | null => {
  switch (segment) {
    case 'query':
      return OperationTypeNode.QUERY;
    case 'mutation':
      return OperationTypeNode.MUTATION;
    case 'subscription':
      return OperationTypeNode.SUBSCRIPTION;
    default:
      return null;
  }
};

export function parseSchemaPath(path: string): {
  operation: OperationTypeNode | null;
  segments: SchemaPathSegment[];
} {
  const [operation, ...rest] = path.split('.');

  return { operation: toOperation(operation), segments: rest.map(toSegment) };
}

/**
 * Field names only. Search matches against this so a type condition cannot match
 * on the spelling of its own sigil, and labels read as GraphQL rather than as paths.
 */
export function toFieldSegments(segments: readonly SchemaPathSegment[]): string[] {
  return segments.flatMap(segment => (segment.kind === 'field' ? [segment.name] : []));
}

const rootTypeFor = (operation: OperationTypeNode, schema: GraphQLSchema) => {
  switch (operation) {
    case OperationTypeNode.QUERY:
      return schema.getQueryType();
    case OperationTypeNode.MUTATION:
      return schema.getMutationType();
    case OperationTypeNode.SUBSCRIPTION:
      return schema.getSubscriptionType();
  }
};

/**
 * Walks a dotted path against the schema, one step per segment. Returns null on
 * any miss rather than a partial walk, so a caller can never mistake the last
 * type it happened to resolve for the one the path named.
 */
export function resolveSchemaPath(path: string, schema: GraphQLSchema): SchemaPathStep[] | null {
  const { operation, segments } = parseSchemaPath(path);

  if (!operation || segments.length === 0) {
    return null;
  }

  let current: GraphQLNamedType | null | undefined = rootTypeFor(operation, schema);
  const steps: SchemaPathStep[] = [];

  for (const segment of segments) {
    if (!current) {
      return null;
    }

    if (segment.kind === 'typeCondition') {
      const candidate = schema.getType(segment.typeName);

      if (!candidate || !isObjectType(candidate)) {
        return null;
      }

      if (isObjectType(current)) {
        // Narrowing an object to anything but itself selects nothing.
        if (current.name !== candidate.name) {
          return null;
        }
      } else if (isUnionType(current) || isInterfaceType(current)) {
        if (!schema.isSubType(current, candidate)) {
          return null;
        }
      } else {
        return null;
      }

      steps.push({ segment, parentType: current, field: null, type: candidate });
      current = candidate;
      continue;
    }

    if (!isObjectType(current) && !isInterfaceType(current)) {
      return null;
    }

    // Annotated because `current` is reassigned from `type` below, which makes
    // the inference of both circular.
    const field: GraphQLField<unknown, unknown> | undefined = current.getFields()[segment.name];

    if (!field) {
      return null;
    }

    const type: GraphQLNamedType = getNamedType(field.type);

    steps.push({ segment, parentType: current, field, type });
    current = type;
  }

  return steps;
}
