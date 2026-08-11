import {
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  type GraphQLNamedType,
  type GraphQLSchema,
} from 'graphql';

export interface DocsSearchResult {
  types: GraphQLNamedType[];
  fields: { typeName: string; fieldName: string }[];
  enumValues: { typeName: string; valueName: string }[];
  hasMore: boolean;
}

const EMPTY: DocsSearchResult = { types: [], fields: [], enumValues: [], hasMore: false };

/**
 * Walks the type map rather than reusing the Builder's `searchSchemaPaths`, which
 * only follows field paths out from the root operation types and stops at depth 8.
 * Docs has to reach input objects, argument types and enum values, none of which
 * that traversal can see.
 */
export const searchSchemaDocs = (
  schema: GraphQLSchema | null,
  search: string,
  options?: { maxResults?: number },
): DocsSearchResult => {
  const normalized = search.trim().toLowerCase();

  if (!schema || !normalized) {
    return EMPTY;
  }

  const maxResults = options?.maxResults ?? 100;
  const result: DocsSearchResult = { types: [], fields: [], enumValues: [], hasMore: false };

  let count = 0;
  const room = () => {
    if (count >= maxResults) {
      result.hasMore = true;
      return false;
    }
    count++;
    return true;
  };

  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__')) {
      continue;
    }

    if (type.name.toLowerCase().includes(normalized)) {
      if (!room()) {
        return result;
      }
      result.types.push(type);
    }

    if (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type)) {
      for (const field of Object.values(type.getFields())) {
        if (field.name.toLowerCase().includes(normalized)) {
          if (!room()) {
            return result;
          }
          result.fields.push({ typeName: type.name, fieldName: field.name });
        }
      }
      continue;
    }

    if (isEnumType(type)) {
      for (const value of type.getValues()) {
        if (value.name.toLowerCase().includes(normalized)) {
          if (!room()) {
            return result;
          }
          result.enumValues.push({ typeName: type.name, valueName: value.name });
        }
      }
    }
  }

  return result;
};
