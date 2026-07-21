import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import { ConfigModel, LegacyConfigModel } from '../src/helpers/config';

// The `$id`/`$schema` URL users reference from their `hive.json`. Must match the repository slug
// (graphql-hive/console) so the schema resolves over raw.githubusercontent.com.
const SCHEMA_ID =
  'https://raw.githubusercontent.com/graphql-hive/console/main/packages/libraries/cli/hive-config.schema.json';

const SCHEMA_PATH = join(__dirname, '..', 'hive-config.schema.json');

type JsonSchema = Record<string, unknown>;

const schemaProperty: JsonSchema = {
  type: 'string',
  description: 'URL of the JSON Schema used to validate this file.',
};

// Minimal Zod -> JSON Schema converter covering the constructs the config models use
// (objects, strings, `.url()`, `.optional()`, `.describe()`). It throws on anything else so that
// unsupported additions fail loudly during `generate:schema` instead of silently producing an
// incorrect schema.
function toJsonSchema(schema: z.ZodTypeAny): JsonSchema {
  if (schema instanceof z.ZodOptional) {
    return toJsonSchema(schema.unwrap() as z.ZodTypeAny);
  }

  if (schema instanceof z.ZodObject) {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];
    const shape = schema.shape as Record<string, z.ZodTypeAny>;

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = toJsonSchema(value);
      if (!(value instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    const output: JsonSchema = { type: 'object', additionalProperties: false };
    if (schema.description) {
      output.description = schema.description;
    }
    output.properties = properties;
    if (required.length > 0) {
      output.required = required;
    }
    return output;
  }

  if (schema instanceof z.ZodString) {
    const output: JsonSchema = { type: 'string' };
    if (schema._def.checks.some(check => check.kind === 'url')) {
      output.format = 'uri';
    }
    if (schema.description) {
      output.description = schema.description;
    }
    return output;
  }

  throw new Error(
    `Unsupported Zod type in the hive-config schema generator: ${schema.constructor.name}. Extend toJsonSchema() in scripts/generate-config-schema.ts to handle it.`,
  );
}

function configDefinition(model: z.ZodTypeAny, description: string): JsonSchema {
  const base = toJsonSchema(model);
  const properties = (base.properties ?? {}) as Record<string, JsonSchema>;
  return {
    type: 'object',
    additionalProperties: false,
    description,
    properties: { $schema: schemaProperty, ...properties },
  };
}

export function buildConfigSchema(): JsonSchema {
  const modernConfig = configDefinition(ConfigModel, 'Hive CLI configuration.');
  const legacyConfig = configDefinition(
    LegacyConfigModel,
    'Deprecated flat configuration format. Use the `registry` object (modernConfig) instead.',
  );
  const namespacedConfig: JsonSchema = {
    type: 'object',
    description:
      "Multiple named configurations ('spaces'). The active space is selected with the HIVE_SPACE environment variable, falling back to the `default` space. Each value is a Hive CLI configuration.",
    properties: { $schema: schemaProperty },
    additionalProperties: {
      anyOf: [{ $ref: '#/definitions/modernConfig' }, { $ref: '#/definitions/legacyConfig' }],
    },
  };

  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: SCHEMA_ID,
    title: 'GraphQL Hive CLI configuration (hive.json)',
    description:
      'Configuration file for the GraphQL Hive CLI (`hive`). Configuration is resolved with the priority: CLI arguments > environment variables > hive.json. See https://the-guild.dev/graphql/hive/docs/api-reference/cli for details.',
    $comment:
      'Generated from ConfigModel and LegacyConfigModel in src/helpers/config.ts by scripts/generate-config-schema.ts. Do not edit by hand; run `pnpm --filter @graphql-hive/cli generate:schema`.',
    anyOf: [
      { $ref: '#/definitions/modernConfig' },
      { $ref: '#/definitions/legacyConfig' },
      { $ref: '#/definitions/namespacedConfig' },
    ],
    definitions: { modernConfig, legacyConfig, namespacedConfig },
  };
}

export function serializeConfigSchema(): string {
  return `${JSON.stringify(buildConfigSchema(), null, 2)}\n`;
}

if (process.argv[1]?.endsWith('generate-config-schema.ts')) {
  writeFileSync(SCHEMA_PATH, serializeConfigSchema());
}
