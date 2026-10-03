import { describe, expect, it } from 'vitest';
import { generate } from '@graphql-codegen/cli';
import config from './codegen.mjs';

const schemaTarget = (() => {
  const target = config.generates['./schema.graphql'];
  if (Array.isArray(target)) {
    throw new Error('expected ./schema.graphql to be a configured output');
  }
  return target;
})();

async function print(schema: string, plugins: typeof schemaTarget.plugins) {
  const [file] = await generate(
    {
      schema,
      silent: true,
      generates: { 'out.graphql': { plugins, config: schemaTarget.config } },
    },
    false,
  );
  return file.content;
}

describe('./schema.graphql codegen target', () => {
  const sdl = /* GraphQL */ `
    input Lookup @oneOf {
      byId: ID
      byName: String
    }
    type Query {
      lookup(input: Lookup!): String
    }
  `;

  // graphql-js counts @oneOf among the built-in directives, so the printer leaves its
  // definition out even though the SDL uses it. The target has to add it back.
  it('schema-ast alone drops the @oneOf definition', async () => {
    const output = await print(sdl, ['schema-ast']);
    expect(output).toContain('input Lookup @oneOf');
    expect(output).not.toContain('directive @oneOf');
  });

  it('the target appends the @oneOf definition after the printed schema', async () => {
    const output = await print(sdl, schemaTarget.plugins);
    expect(output).toContain('input Lookup @oneOf');
    expect(output.trimEnd().endsWith('directive @oneOf on INPUT_OBJECT')).toBe(true);
    expect(output.match(/directive @oneOf/g)).toHaveLength(1);
  });

  it('prints the real API schema with exactly one @oneOf definition at the end', async () => {
    const [file] = await generate(
      { schema: config.schema, silent: true, generates: { './schema.graphql': schemaTarget } },
      false,
    );
    expect(file.content).toContain('type Query');
    expect(file.content.trimEnd().endsWith('directive @oneOf on INPUT_OBJECT')).toBe(true);
    expect(file.content.match(/directive @oneOf/g)).toHaveLength(1);
  }, 60_000);
});
