import { isInputObjectType, isObjectType, isScalarType, specifiedScalarTypes } from 'graphql';
import { loadHiveSchema } from './schema';

describe('loadHiveSchema', () => {
  test('builds the full API schema from the module SDL files', async () => {
    const schema = await loadHiveSchema();

    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getMutationType()).toBeDefined();
    expect(schema.getSubscriptionType()).toBeDefined();
    expect(Object.keys(schema.getTypeMap()).length).toBeGreaterThan(500);
  });

  test('is cached across calls', async () => {
    expect(await loadHiveSchema()).toBe(await loadHiveSchema());
  });

  test('carries the directives the shared module declares, without codegen appending them', async () => {
    const schema = await loadHiveSchema();

    for (const name of ['oneOf', 'link', 'composeDirective', 'tag']) {
      expect(schema.getDirective(name), name).toBeDefined();
    }
    // A duplicate @oneOf would mean someone re-added the codegen append on top of the shared module.
    expect(schema.getDirectives().filter(d => d.name === 'oneOf')).toHaveLength(1);
  });

  test('parses @oneOf into isOneOf so variable coercion enforces it', async () => {
    const schema = await loadHiveSchema();
    const reference = schema.getType('TargetReferenceInput');

    expect(isInputObjectType(reference) && reference.isOneOf).toBe(true);
  });

  test('exposes the viewerCan* permission fields the UI gates on', async () => {
    const schema = await loadHiveSchema();
    const names = new Set<string>();

    for (const type of Object.values(schema.getTypeMap())) {
      if (!isObjectType(type)) continue;
      for (const field of Object.keys(type.getFields())) {
        if (field.startsWith('viewerCan')) names.add(field);
      }
    }

    expect(names.size).toBeGreaterThanOrEqual(38);
    expect(names).toContain('viewerCanAccessSettings');
    expect(names).toContain('viewerCanManageSupportTickets');
    expect(names).toContain('viewerCanUseMetricAlertRules');
  });

  test('declares exactly the custom scalars the mock layer must provide values for', async () => {
    const schema = await loadHiveSchema();
    const builtIn = new Set(specifiedScalarTypes.map(t => t.name));
    const custom = Object.values(schema.getTypeMap())
      .filter(t => isScalarType(t) && !builtIn.has(t.name))
      .map(t => t.name)
      .sort();

    expect(custom).toEqual([
      'Date',
      'DateTime',
      'DateTime64',
      'JSON',
      'JSONObject',
      'JSONSchemaObject',
      'SafeInt',
    ]);
  });
});
