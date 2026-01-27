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
import { createSchemaObject } from '../../../shared/entities';
import { cache } from '../../../shared/helpers';
import { sortDocumentNode } from '../../../shared/schema';

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
  @cache<CreateSchemaObjectInput>(schema => JSON.stringify(schema))
  createSchemaObject(schema: CreateSchemaObjectInput): SchemaObject {
    return createSchemaObject(schema);
  }

  createChecksum(schema: SchemaInput): string {
    const hasher = createHash('md5');

    hasher.update(print(sortDocumentNode(this.createSchemaObject(schema).document)), 'utf-8');
    hasher.update(`service_name: ${schema.serviceName ?? ''}`, 'utf-8');
    hasher.update(`service_url: ${schema.serviceUrl ?? ''}`, 'utf-8');
    hasher.update(
      `metadata: ${schema.metadata ? objectHash(JSON.parse(schema.metadata)) : ''}`,
      'utf-8',
    );

    return hasher.digest('hex');
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
