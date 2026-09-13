import {
  getNamedType,
  getNullableType,
  isAbstractType,
  isEnumType,
  isListType,
  isObjectType,
  type GraphQLField,
  type GraphQLObjectType,
  type GraphQLSchema,
} from 'graphql';
import { EMPTY } from '@/dev/pins';
import { base, en, Faker } from '@faker-js/faker';
import { MockList, type IMocks } from '@graphql-tools/mock';

export type MockOptions = {
  seed?: number;
  /** Value for every Boolean field named viewerCan*. Default true. */
  viewerCan?: boolean;
  /** Constant or thunk per "Type.field", layered last so scenarios win. */
  fields?: Record<string, unknown>;
};

export const SDL_SAMPLE = [
  'type Query {',
  '  me: User',
  '  users(first: Int = 10): [User!]!',
  '}',
  '',
  'type User {',
  '  id: ID!',
  '  name: String!',
  '  email: String!',
  '}',
  '',
].join('\n');

// Every other Boolean defaults to true so gates open and features show. These are the
// warning-shaped ones that should stay off unless a scenario turns them on.
const FALSE_BOOLEANS =
  /Exceeded|Issue|Locked|Disabled|Deprecated|Retired|Expired|Skipped|ReadOnly|hasNextPage|hasPreviousPage|CompositionErrors|Unapproved|isFirstComposable|experimental_/;

const looksLikeError = (type: GraphQLObjectType) =>
  type.getInterfaces().some(i => i.name === 'Error') || /Error$|Retry$|NotFound/.test(type.name);

export function buildMocks(schema: GraphQLSchema, options: MockOptions = {}): IMocks {
  const faker = new Faker({ locale: [en, base] });
  faker.seed(options.seed ?? 1);

  const mocks: Record<string, unknown> = {
    ID: () => faker.string.uuid(),
    String: () => faker.word.words({ count: { min: 1, max: 3 } }),
    Int: () => faker.number.int({ min: 1, max: 100 }),
    Float: () => faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    Boolean: () => true,
    SafeInt: () => faker.number.int({ min: 1, max: 100_000 }),
    DateTime: () => faker.date.recent({ days: 30 }).toISOString(),
    DateTime64: () => faker.date.recent({ days: 30 }).toISOString().replace('Z', '000Z'),
    Date: () => faker.date.recent({ days: 30 }).toISOString().slice(0, 10),
    JSON: () => ({}),
    JSONObject: () => ({}),
    JSONSchemaObject: () => ({ type: 'object' }),
  };

  for (const type of Object.values(schema.getTypeMap())) {
    if (type.name.startsWith('__')) continue;

    if (isEnumType(type)) {
      const values = type.getValues().map(v => v.value);
      mocks[type.name] = () => faker.helpers.arrayElement(values);
    } else if (isAbstractType(type)) {
      // Object form on purpose: the function form would push __typename into concrete types.
      const all = schema.getPossibleTypes(type);
      const preferred = all.filter(t => !looksLikeError(t));
      const pool = preferred.length > 0 ? preferred : all;
      mocks[type.name] = { __typename: () => faker.helpers.arrayElement(pool).name };
    } else if (isObjectType(type)) {
      const fieldMocks: Record<string, () => unknown> = {};
      for (const field of Object.values(type.getFields())) {
        const fn = fieldMock(type, field, faker, options);
        if (fn) fieldMocks[field.name] = fn;
      }
      if (Object.keys(fieldMocks).length > 0) mocks[type.name] = fieldMocks;
    }
  }

  mocks.BillingPlanType = () => 'PRO';
  mocks.FieldLevelMetricsDisplayState = () => 'ON';
  mocks.ProjectType = () => 'FEDERATION';

  for (const [path, value] of Object.entries(options.fields ?? {})) {
    const [typeName, fieldName] = path.split('.');
    const bucket = (mocks[typeName] ??= {}) as Record<string, () => unknown>;
    const resolved = value === EMPTY ? emptyValueFor(schema, typeName, fieldName) : value;
    bucket[fieldName] =
      typeof resolved === 'function' ? (resolved as () => unknown) : () => resolved;
  }

  return mocks as IMocks;
}

/**
 * What "@empty" means for a field: [] for a list, a connection with no edges or nodes for a
 * connection type, otherwise null. Lets a pin empty any list without knowing its shape.
 */
export function emptyValueFor(schema: GraphQLSchema, typeName: string, fieldName: string): unknown {
  const parent = schema.getType(typeName);
  const field = isObjectType(parent) ? parent.getFields()[fieldName] : undefined;
  if (!field) return null;
  const type = getNullableType(field.type);
  if (isListType(type)) return [];
  if (!isObjectType(type)) return null;

  const fields = type.getFields();
  const empty: Record<string, unknown> = {};
  if ('edges' in fields) empty.edges = [];
  if ('nodes' in fields) empty.nodes = [];
  for (const name of ['total', 'totalCount', 'count']) if (name in fields) empty[name] = 0;
  if ('pageInfo' in fields) {
    empty.pageInfo = { hasNextPage: false, hasPreviousPage: false, startCursor: '', endCursor: '' };
  }
  return Object.keys(empty).length > 0 ? empty : null;
}

function fieldMock(
  type: GraphQLObjectType,
  field: GraphQLField<unknown, unknown>,
  faker: Faker,
  options: MockOptions,
): (() => unknown) | undefined {
  const name = field.name;
  const named = getNamedType(field.type).name;
  const siblings = Object.keys(type.getFields());

  if (named === 'Boolean') {
    if (name.startsWith('viewerCan')) return () => options.viewerCan ?? true;
    if (FALSE_BOOLEANS.test(name)) return () => false;
    return () => true;
  }

  // Mutation results are { ok, error }; populating both confuses the UI.
  if (name === 'error' && siblings.length === 2 && siblings.includes('ok')) return () => null;

  if (isListType(getNullableType(field.type))) {
    if (name === 'edges' || name === 'nodes') return () => new MockList([3, 8]);
    if (/OverTime$/.test(name)) return () => new MockList(24);
    return undefined;
  }

  if (named === 'String' || named === 'ID') {
    if (name === 'slug' || name === 'cleanId') {
      return () => faker.helpers.slugify(faker.company.buzzNoun()).toLowerCase();
    }
    if (/sdl$|^supergraph$|^schema$|^source$/i.test(name)) return () => SDL_SAMPLE;
    if (name === 'email')
      return () => faker.internet.email({ provider: 'example.com' }).toLowerCase();
    if (/^(displayName|fullName|author)$/.test(name)) return () => faker.person.fullName();
    if (name === 'name' && /^(Organization|Project|Target)$/.test(type.name)) {
      return () => faker.company.name();
    }
    if (/name$/i.test(name) || name === 'title' || name === 'subject') {
      return () => faker.commerce.productName();
    }
    if (/^(description|body|message|reason|comment|text)$/.test(name)) {
      return () => faker.lorem.sentence();
    }
    if (/url$/i.test(name) || name === 'endpoint') return () => faker.internet.url();
    if (/^(commit|sha)$|Sha$/.test(name)) return () => faker.git.commitSha();
    if (/version$/i.test(name)) return () => faker.system.semver();
    if (/cursor$/i.test(name)) return () => faker.string.alphanumeric(16);
    if (/token$|secret$|^key$/i.test(name)) return () => faker.string.alphanumeric(32);
    // Covers date-ish fields typed String!, e.g. SchemaCheck.createdAt.
    if (/(At|Date)$/.test(name)) return () => faker.date.recent({ days: 30 }).toISOString();
    if (name === 'service' || name === 'serviceName') {
      return () => faker.helpers.arrayElement(['users', 'products', 'reviews', 'inventory']);
    }
    return undefined;
  }

  if (named === 'Int' || named === 'SafeInt' || named === 'Float') {
    if (/percentage|rate$/i.test(name)) {
      return () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 });
    }
    if (/^p\d\d$|duration|latency/i.test(name))
      return () => faker.number.int({ min: 20, max: 800 });
    if (/limit$/i.test(name)) return () => 1_000_000;
    if (/days$/i.test(name)) return () => 30;
    if (/count$|^total|^operations$|^requests$/i.test(name)) {
      return () => faker.number.int({ min: 0, max: 50_000 });
    }
    return undefined;
  }

  return undefined;
}
