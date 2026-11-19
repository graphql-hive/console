import { createHash } from 'node:crypto';
import { DocumentNode, print, visit } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import objectHash from 'object-hash';
import type {
  CompositeSchema,
  CreateSchemaObjectInput,
  PushedCompositeSchema,
  Schema,
  SchemaObject,
  SingleSchema,
} from '../../../shared/entities';
import { createSchemaObjectFromDocument, hashSDL, parseSchemaSDL } from '../../../shared/entities';

export { addTypeForExtensions } from '../lib/schema-diff';

export function isSingleSchema(schema: Schema): schema is SingleSchema {
  return schema.kind === 'single';
}

export function isCompositeSchema(schema: Schema): schema is CompositeSchema {
  return schema.kind === 'composite';
}

export function ensureSingleSchema(schema: Schema | Schema[]): SingleSchema {
  if (Array.isArray(schema)) {
    if (schema.length > 1) {
      throw new Error(`Expected a single schema, got ${schema.length}`);
    }
    return ensureSingleSchema(schema[0]);
  }

  if (isSingleSchema(schema)) {
    return schema;
  }

  throw new Error('Expected a single schema');
}

export function ensureCompositeSchemas(schemas: readonly Schema[]): CompositeSchema[] {
  return schemas.filter(isCompositeSchema);
}

export function serviceExists(schemas: CompositeSchema[], serviceName: string) {
  return schemas.some(s => s.service_name === serviceName);
}

export function swapServices(
  schemas: CompositeSchemaInput[],
  newSchema: CompositeSchemaInput,
): {
  schemas: CompositeSchemaInput[];
  existing: CompositeSchemaInput | null;
} {
  let swapped: CompositeSchemaInput | null = null;
  const output = schemas.map(existing => {
    if (existing.serviceName === newSchema.serviceName) {
      swapped = existing;
      return newSchema;
    }

    return existing;
  });

  if (!swapped) {
    output.push(newSchema);
  }

  return {
    schemas: output,
    existing: swapped,
  };
}

export function extendWithBase(schemas: Array<SchemaInput>, baseSchema: string | null) {
  if (!baseSchema) {
    return schemas;
  }

  return schemas.map((schema, index) => {
    if (index === 0) {
      return {
        ...schema,
        source: baseSchema + ' ' + schema.sdl,
      };
    }

    return schema;
  });
}

export function removeDescriptions(documentNode: DocumentNode): DocumentNode {
  return visit(documentNode, {
    enter(node) {
      if ('description' in node) {
        return {
          ...node,
          description: null,
        };
      }
    },
  });
}

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class SchemaHelper {
  /** Parsed documents keyed by SDL, for sharing. :) */
  private documents = new Map<string, DocumentNode>();
  /** Results of `hashSDL` keyed by SDL. */
  private sdlHashes = new Map<string, string>();

  createSchemaObject(schema: CreateSchemaObjectInput): SchemaObject {
    return createSchemaObjectFromDocument(schema, this.parse(schema.sdl));
  }

  /**
   * Hash of the sorted and printed SDL (see `hashSDL`), so it ignores the order of definitions, fields etc.
   * Used to detect whether a schema changed. Computed once per distinct SDL per operation.
   * Throws GraphQLDocumentStringInvalidError in case the SDL is not valid.
   */
  hashSDL(sdl: string): string {
    let hash = this.sdlHashes.get(sdl);
    if (hash === undefined) {
      hash = hashSDL(this.parse(sdl));
      this.sdlHashes.set(sdl, hash);
    }
    return hash;
  }

  /**
   * Prints the SDL in a consistent format.
   * Returns the SDL as-is in case it is not valid.
   */
  prettifySDL(sdl: string): string {
    try {
      return print(this.parse(sdl));
    } catch {
      return sdl;
    }
  }

  private parse(sdl: string): DocumentNode {
    let document = this.documents.get(sdl);
    if (document === undefined) {
      document = parseSchemaSDL(sdl);
      this.documents.set(sdl, document);
    }
    return document;
  }

  /**
   * Only used to compare schemas within an operation, it is not persisted.
   */
  createChecksum(schema: SchemaInput): string {
    const hasher = createHash('md5');

    hasher.update(`sdl: ${this.hashSDL(schema.sdl)}`, 'utf-8');
    hasher.update(`service_name: ${schema.serviceName ?? ''}`, 'utf-8');
    hasher.update(`service_url: ${schema.serviceUrl ?? ''}`, 'utf-8');
    hasher.update(`metadata: ${hashMetadata(schema.metadata)}`, 'utf-8');

    return hasher.digest('hex');
  }
}

/**
 * Metadata that is not valid JSON is rejected by the metadata check,
 * so it only needs a checksum that differs from any stored metadata.
 */
function hashMetadata(metadata: string | null | undefined): string {
  if (!metadata) {
    return '';
  }

  try {
    return objectHash(JSON.parse(metadata));
  } catch {
    return objectHash(metadata);
  }
}

export function toCompositeSchemaInput(schema: PushedCompositeSchema): CompositeSchemaInput {
  return {
    id: schema.id,
    metadata: schema.metadata,
    sdl: schema.sdl,
    serviceName: schema.service_name,
    // service_url can be null for very old records from 2023
    // The default value mapping should happen on the database read level
    // but right now we are doing that here until we refactor the database read level (Storage class)
    serviceUrl: schema.service_url ?? '',
  };
}

export function toSingleSchemaInput(schema: SingleSchema): SingleSchemaInput {
  return {
    id: schema.id,
    metadata: schema.metadata,
    sdl: schema.sdl,
    // Note: due to a "bug" we inserted service_name for single schemas into the schema_log table.
    // We set it explicitly to null to avoid any confusion in other parts of the business logic
    serviceName: null,
    serviceUrl: null,
  };
}

export type CompositeSchemaInput = {
  id: string;
  sdl: string;
  serviceName: string;
  serviceUrl: string;
  metadata: string | null;
};

export type SingleSchemaInput = {
  id: string;
  sdl: string;
  serviceName: null;
  serviceUrl: null;
  metadata: string | null;
};

export type SchemaInput = CompositeSchemaInput | SingleSchemaInput;
