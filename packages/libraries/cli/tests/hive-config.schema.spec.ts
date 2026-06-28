import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';

// Compiles the shipped JSON Schema and asserts it accepts every `hive.json` shape
// the `Config` class accepts and rejects common typos. Keep the fixtures in sync
// with ConfigModel / LegacyConfigModel in src/helpers/config.ts.
const schema = JSON.parse(
  readFileSync(join(__dirname, '..', 'hive-config.schema.json'), 'utf8'),
) as Record<string, unknown>;

// `strict: false`: the schema uses `format: "uri"`, which bare ajv does not
// register. This suite tests structure (shapes + typos), not URI formatting.
const ajv = new Ajv({ strict: false, allErrors: true });
const validate = ajv.compile(schema);

const SCHEMA_URL =
  'https://raw.githubusercontent.com/graphql-hive/console/main/packages/libraries/cli/hive-config.schema.json';

const registry = {
  endpoint: 'https://app.graphql-hive.com/graphql',
  accessToken: 'a-registry-token',
};
const cdn = {
  endpoint: 'https://cdn.graphql-hive.com/artifacts/v1/target',
  accessToken: 'a-cdn-token',
};

const validConfigs: Array<[string, unknown]> = [
  ['a modern config with registry only', { registry }],
  ['a modern config with registry and cdn', { registry, cdn }],
  ['an empty config', {}],
  ['a modern config with a $schema reference', { $schema: SCHEMA_URL, registry }],
  ['a legacy flat config', { registry: 'https://app.graphql-hive.com/graphql', token: 'a-token' }],
  [
    'a legacy flat config with a $schema reference',
    { $schema: SCHEMA_URL, registry: 'https://app.graphql-hive.com/graphql', token: 'a-token' },
  ],
  [
    'a namespaced config with default and named spaces',
    { default: { registry }, production: { registry } },
  ],
  ['a namespaced config with a $schema reference', { $schema: SCHEMA_URL, default: { registry } }],
];

const invalidConfigs: Array<[string, unknown]> = [
  [
    'a misspelled top-level "registery" key',
    { registery: { endpoint: 'https://app.graphql-hive.com/graphql' } },
  ],
  [
    'a misspelled nested "accesToken" key',
    { registry: { endpoint: 'https://app.graphql-hive.com/graphql', accesToken: 'a-token' } },
  ],
  ['a non-string registry endpoint', { registry: { endpoint: 123 } }],
  ['a registry that is neither an object nor a string', { registry: true }],
];

describe('hive-config.schema.json', () => {
  test('compiles as a valid JSON Schema', () => {
    expect(typeof validate).toBe('function');
  });

  test.each(validConfigs)('accepts %s', (_name, config) => {
    const isValid = validate(config);
    expect(isValid, ajv.errorsText(validate.errors)).toBe(true);
  });

  test.each(invalidConfigs)('rejects %s', (_name, config) => {
    const isValid = validate(config);
    expect(isValid).toBe(false);
  });
});
