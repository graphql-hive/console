import type { GraphQLSchema } from 'graphql';
import { collectPinnableFields } from './page-fields';
import { loadPersistedOperations } from './persisted-operations';
import { loadHiveSchema } from './schema';

const document = (name: string) => {
  const op = loadPersistedOperations().find(o => o.name === name);
  if (!op) throw new Error(`No persisted operation named ${name}`);
  return op.document;
};

describe('collectPinnableFields', () => {
  let schema: GraphQLSchema;

  beforeAll(async () => {
    schema = await loadHiveSchema();
  });

  test('finds the gates the support page can branch on, with the right kinds', () => {
    const fields = collectPinnableFields(schema, [document('SupportPageQuery')]);
    const byKey = Object.fromEntries(fields.map(f => [f.key, f]));

    expect(byKey['Organization.supportTickets']).toMatchObject({
      kind: 'connection',
      nullable: true,
      operations: ['SupportPageQuery'],
    });
    expect(byKey['SupportTicket.status']).toMatchObject({
      kind: 'enum',
      enumValues: ['OPEN', 'SOLVED'],
    });
    expect(byKey['SupportTicket.subject']).toMatchObject({ kind: 'string', nullable: false });
  });

  test('sees through fragments and reports every viewerCan* on the target layout', () => {
    const fields = collectPinnableFields(schema, [document('TargetLayoutQuery')]);
    const keys = fields.map(f => f.key);

    expect(keys).toContain('Target.viewerCanAccessSettings');
    expect(keys).toContain('Target.latestSchemaVersion');
    expect(fields.find(f => f.key === 'Target.latestSchemaVersion')).toMatchObject({
      kind: 'object',
      nullable: true,
    });
    expect(keys).toContain('Query.isCDNEnabled');
  });

  test('tells fields on the page apart from fields on every item of a list', () => {
    const fields = collectPinnableFields(schema, [document('SupportPageQuery')]);
    const byKey = Object.fromEntries(fields.map(f => [f.key, f]));

    // Reached via organizationBySlug: one thing on the page.
    expect(byKey['Organization.supportTickets'].perItem).toBe(false);
    expect(byKey['Organization.slug'].perItem).toBe(false);
    // Only reached via supportTickets.edges.node: a pin hits every ticket.
    expect(byKey['SupportTicket.priority'].perItem).toBe(true);
    expect(byKey['SupportTicket.status'].perItem).toBe(true);
  });

  test('a field reached both ways counts as on the page', () => {
    // TargetLayoutQuery selects Organization.slug via organizationBySlug and via organizations.nodes.
    const fields = collectPinnableFields(schema, [document('TargetLayoutQuery')]);

    expect(fields.find(f => f.key === 'Organization.slug')?.perItem).toBe(false);
  });

  test('skips ids, cursors, __typename, and non-null plain objects', () => {
    const fields = collectPinnableFields(schema, [document('TargetLayoutQuery')]);
    const keys = fields.map(f => f.key);

    expect(keys.some(k => k.endsWith('.id'))).toBe(false);
    expect(keys.some(k => k.endsWith('.__typename'))).toBe(false);
    // organizationBySlug returns Organization (nullable): pinnable to null.
    // The layout's `me: User!` is a non-null object: nothing to pin it to.
    expect(keys).toContain('Query.organizationBySlug');
    expect(keys).not.toContain('Query.me');
  });

  test('merges the same field across documents and lists every operation that selects it', () => {
    const fields = collectPinnableFields(schema, [
      document('TargetLayoutQuery'),
      document('SupportPageQuery'),
    ]);
    const orgSlug = fields.find(f => f.key === 'Organization.slug');

    expect(orgSlug?.operations).toEqual(['TargetLayoutQuery', 'SupportPageQuery']);
    expect(new Set(fields.map(f => f.key)).size).toBe(fields.length);
  });

  test('is sorted and deterministic', () => {
    const docs = [document('SupportPageQuery'), document('TargetLayoutQuery')];
    const a = collectPinnableFields(schema, docs).map(f => f.key);
    const b = collectPinnableFields(schema, [...docs].reverse()).map(f => f.key);

    expect(a).toEqual([...a].sort());
    expect(a).toEqual(b);
  });
});
