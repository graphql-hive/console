import { isObjectType, type GraphQLSchema } from 'graphql';
import { MOCK_USER } from '@/dev/mock-user';
import type { ResolverMap, Scenario } from '@/dev/scenarios';
import { WORLD } from '@/dev/world';
import { isRef, type IMockStore, type Ref } from '@graphql-tools/mock';

const titleCase = (slug: string) =>
  slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const keyOf = (ref: Ref) => ref.$ref.key;

// Entity keys encode the slug path so a URL resolves to the same store entity every time
// and Query.x(reference: { byId }) with a previously issued id finds it again.
const orgKey = (org: string) => `org_${org}`;
const projectKey = (org: string, project: string) => `project_${org}_${project}`;
const targetKey = (org: string, project: string, target: string) =>
  `target_${org}_${project}_${target}`;

export function buildResolvers(
  schema: GraphQLSchema,
  store: IMockStore,
  scenario: Scenario,
): ResolverMap {
  // store.get with a key always returns a Ref; the library types it as unknown | Ref.
  const entity = (typeName: string, key: string, slug: string) =>
    store.get(typeName, key, { slug, cleanId: slug, name: titleCase(slug) }) as Ref;
  const org = (slug: string) => entity('Organization', orgKey(slug), slug);
  const project = (o: string, slug: string) => entity('Project', projectKey(o, slug), slug);
  const target = (o: string, p: string, slug: string) =>
    entity('Target', targetKey(o, p, slug), slug);
  const me = () => store.get('User', MOCK_USER.id, MOCK_USER) as Ref;

  const connection = (nodes: Ref[]) => ({
    edges: nodes.map(node => ({ node, cursor: keyOf(node) })),
    pageInfo: {
      hasNextPage: false,
      hasPreviousPage: false,
      startCursor: nodes[0] ? keyOf(nodes[0]) : '',
      endCursor: nodes.at(-1) ? keyOf(nodes.at(-1)!) : '',
    },
  });

  // ['org', slug] | ['project', org, slug] | ['target', org, project, slug]
  const parts = (ref: Ref) => keyOf(ref).split('_');
  const targetsOf = (o: string, p: string) =>
    connection(WORLD.targets.map(t => target(o, p, t.slug)));

  const base: ResolverMap = {
    Query: {
      me,
      organizationBySlug: (_p, args) => org(args.organizationSlug),
      organization: (_p, { reference }) =>
        reference.byId
          ? store.get('Organization', reference.byId)
          : org(reference.bySelector.organizationSlug),
      project: (_p, { reference }) =>
        reference.byId
          ? store.get('Project', reference.byId)
          : project(reference.bySelector.organizationSlug, reference.bySelector.projectSlug),
      target: (_p, { reference }) =>
        reference.byId
          ? store.get('Target', reference.byId)
          : target(
              reference.bySelector.organizationSlug,
              reference.bySelector.projectSlug,
              reference.bySelector.targetSlug,
            ),
      organizations: () => ({
        nodes: WORLD.organizations.map(o => org(o.slug)),
        total: WORLD.organizations.length,
      }),
      myDefaultOrganization: () => {
        const slug = WORLD.organizations[0].slug;
        return { selector: { organizationSlug: slug }, organization: org(slug) };
      },
      // The project page lists targets through this root field, not Project.targets. Both
      // must agree or the breadcrumb cannot find the target you navigated to.
      targets: (_p, { selector }) => targetsOf(selector.organizationSlug, selector.projectSlug),
      latestValidVersion: (_p, { target: reference }) =>
        reference?.bySelector
          ? store.get(
              target(
                reference.bySelector.organizationSlug,
                reference.bySelector.projectSlug,
                reference.bySelector.targetSlug,
              ),
              'latestSchemaVersion',
            )
          : undefined,
      // Root Booleans (hasCollectedOperations, isCDNEnabled, ...) are deliberately not
      // resolved here: a resolver would beat a scenario's field pin, the Boolean rule does not.
    },
    Organization: {
      // isOwner is left to the Boolean rule (true) so a scenario can pin it false.
      me: parent => store.get('Member', `member_${keyOf(parent)}`, { user: me() }),
      projectBySlug: (parent, args) => project(parts(parent)[1], args.projectSlug),
      projects: parent => connection(WORLD.projects.map(p => project(parts(parent)[1], p.slug))),
    },
    Project: {
      targetBySlug: (parent, args) => {
        const [, o, p] = parts(parent);
        return target(o, p, args.targetSlug);
      },
      targets: parent => {
        const [, o, p] = parts(parent);
        return targetsOf(o, p);
      },
    },
    Target: {
      // The latest version is composable by default, so the two are the same entity. A
      // scenario returns a distinct one to show the "outdated schema" banner.
      latestValidSchemaVersion: parent => store.get(parent, 'latestSchemaVersion'),
    },
  };

  return mergeResolverMaps(
    withoutPinnedFields(base, scenario),
    paginationInsensitive(schema, store),
    scenario.resolvers?.({ store }) ?? {},
  );
}

/** A resolver would beat a scenario's field pin, so pinned fields fall through to the mock. */
function withoutPinnedFields(map: ResolverMap, scenario: Scenario): ResolverMap {
  const out: ResolverMap = {};
  for (const [typeName, fields] of Object.entries(map)) {
    out[typeName] = Object.fromEntries(
      Object.entries(fields).filter(
        ([field]) => !(`${typeName}.${field}` in (scenario.fields ?? {})),
      ),
    );
  }
  return out;
}

/**
 * Fields taking first/after resolve from the store ignoring the cursor args, so every
 * page of a list is the same stable set instead of fresh entities per cursor.
 */
function paginationInsensitive(schema: GraphQLSchema, store: IMockStore): ResolverMap {
  const out: ResolverMap = {};
  const roots = new Set([schema.getQueryType()?.name, schema.getMutationType()?.name]);

  for (const type of Object.values(schema.getTypeMap())) {
    if (!isObjectType(type) || type.name.startsWith('__')) continue;
    for (const field of Object.values(type.getFields())) {
      if (!field.args.some(a => a.name === 'first' || a.name === 'after')) continue;
      (out[type.name] ??= {})[field.name] = (parent, args) => {
        const { first: _f, after: _a, last: _l, before: _b, ...rest } = args ?? {};
        const key = roots.has(type.name) ? 'ROOT' : isRef(parent) ? parent.$ref.key : undefined;
        // A plain fixture object already carries the value.
        if (key === undefined) return parent[field.name];
        return store.get({ typeName: type.name, key, fieldName: field.name, fieldArgs: rest });
      };
    }
  }

  return out;
}

function mergeResolverMaps(...maps: ResolverMap[]): ResolverMap {
  const out: ResolverMap = {};
  for (const map of maps) {
    for (const [typeName, fields] of Object.entries(map)) {
      Object.assign((out[typeName] ??= {}), fields);
    }
  }
  return out;
}
