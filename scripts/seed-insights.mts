/**
 * Seeds a complete Insights development environment from scratch.
 *
 * Creates: owner account, org, project, target, schema, usage data (30 days),
 * and saved filters with view counts.
 *
 * Prerequisites:
 *   - Docker Compose is running (pnpm local:setup)
 *   - Services are running (pnpm dev:hive)
 *
 * Usage:
 *   bun scripts/seed-insights.mts
 */

import * as readline from 'node:readline/promises';
import { createTRPCProxyClient, httpLink } from '@trpc/client';
import type { CollectedOperation } from '../integration-tests/testkit/usage';

process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
await import('../integration-tests/local-dev.ts');

const { ensureEnv } = await import('../integration-tests/testkit/env');
const { createOrganization, createProject, createToken, publishSchema } = await import(
  '../integration-tests/testkit/flow'
);
const { execute } = await import('../integration-tests/testkit/graphql');
const { legacyCollect } = await import('../integration-tests/testkit/usage');
const { generateUnique, getServiceHost } = await import('../integration-tests/testkit/utils');
const { TargetAccessScope, ProjectType, SavedFilterVisibilityType } = await import(
  '../integration-tests/testkit/gql/graphql'
);
const { CreateSavedFilterMutation, TrackSavedFilterViewMutation } = await import(
  '../integration-tests/testkit/saved-filters'
);

// ---------------------------------------------------------------------------
// Auth helper — handles both new and existing SuperTokens users
// ---------------------------------------------------------------------------

const password = 'ilikebigturtlesandicannotlie47';

async function signInOrSignUp(
  email: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const supertokensUri = ensureEnv('SUPERTOKENS_CONNECTION_URI');
  const apiKey = ensureEnv('SUPERTOKENS_API_KEY');
  const headers = {
    'content-type': 'application/json; charset=UTF-8',
    'api-key': apiKey,
    'cdi-version': '4.0',
  };
  const body = JSON.stringify({ email, password });

  // Try signup first
  let res = await fetch(`${supertokensUri}/appid-public/public/recipe/signup`, {
    method: 'POST',
    headers,
    body,
  });
  let data = (await res.json()) as { status: string; user?: { id: string; emails: string[] } };

  // If user already exists, look them up by email (avoids needing their password)
  if (data.status === 'EMAIL_ALREADY_EXISTS_ERROR') {
    res = await fetch(
      `${supertokensUri}/appid-public/public/recipe/user?email=${encodeURIComponent(email)}`,
      { headers },
    );
    const lookupData = (await res.json()) as {
      status: string;
      user?: { id: string; emails: string[] };
    };
    if (lookupData.status !== 'OK' || !lookupData.user) {
      throw new Error(`User lookup failed for ${email}: ${JSON.stringify(lookupData)}`);
    }
    data = { status: 'OK', user: lookupData.user };
  }

  if (data.status !== 'OK' || !data.user) {
    throw new Error(`Auth failed for ${email}: ${JSON.stringify(data)}`);
  }

  const superTokensUserId = data.user.id;

  // Ensure user exists in Hive DB
  const graphqlAddress = await getServiceHost('server', 8082);
  const internalApi = createTRPCProxyClient<any>({
    links: [httpLink({ url: `http://${graphqlAddress}/trpc`, fetch })],
  });
  const ensureUserResult = await internalApi.ensureUser.mutate({
    superTokensUserId,
    email,
    oidcIntegrationId: null,
    firstName: null,
    lastName: null,
  });
  if (!ensureUserResult.ok) {
    throw new Error(`ensureUser failed: ${ensureUserResult.reason}`);
  }

  // Create session
  const sessionPayload = {
    version: '2',
    superTokensUserId,
    userId: ensureUserResult.user.id,
    oidcIntegrationId: null,
    email,
  };
  const sessionRes = await fetch(`${supertokensUri}/appid-public/public/recipe/session`, {
    method: 'POST',
    headers: { ...headers, rid: 'session' },
    body: JSON.stringify({
      enableAntiCsrf: false,
      userId: superTokensUserId,
      userDataInDatabase: sessionPayload,
      userDataInJWT: sessionPayload,
    }),
  });
  const sessionData = (await sessionRes.json()) as {
    accessToken?: { token: string };
    refreshToken?: { token: string };
  };

  if (!sessionData.accessToken?.token || !sessionData.refreshToken?.token) {
    throw new Error(`Session creation failed: ${JSON.stringify(sessionData)}`);
  }

  return {
    access_token: sessionData.accessToken.token,
    refresh_token: sessionData.refreshToken.token,
  };
}

// ---------------------------------------------------------------------------
// 1. Operations — ~1000 distinct queries/mutations against the Star Wars schema
// ---------------------------------------------------------------------------

type OperationDef = {
  operation: string;
  operationName: string;
  fields: string[];
};

const EPISODES = ['NEWHOPE', 'EMPIRE', 'JEDI'] as const;

// Field selection templates for Character
const CHARACTER_SELECTIONS = [
  { body: 'name', fields: ['Character', 'Character.name'] },
  { body: 'name appearsIn', fields: ['Character', 'Character.name', 'Character.appearsIn'] },
  { body: 'name friends { name }', fields: ['Character', 'Character.name', 'Character.friends'] },
  {
    body: 'name appearsIn friends { name }',
    fields: ['Character', 'Character.name', 'Character.appearsIn', 'Character.friends'],
  },
  {
    body: 'name friends { name appearsIn }',
    fields: ['Character', 'Character.name', 'Character.friends', 'Character.appearsIn'],
  },
  {
    body: 'name friends { name friends { name } }',
    fields: ['Character', 'Character.name', 'Character.friends'],
  },
];

// Inline fragment templates
const HUMAN_SELECTIONS = [
  {
    body: '... on Human { name starships { name } }',
    fields: ['Human', 'Human.name', 'Human.starships', 'Starship', 'Starship.name'],
  },
  {
    body: '... on Human { name totalCredits }',
    fields: ['Human', 'Human.name', 'Human.totalCredits'],
  },
  {
    body: '... on Human { name starships { name length } }',
    fields: [
      'Human',
      'Human.name',
      'Human.starships',
      'Starship',
      'Starship.name',
      'Starship.length',
    ],
  },
  {
    body: '... on Human { name totalCredits starships { name } }',
    fields: [
      'Human',
      'Human.name',
      'Human.totalCredits',
      'Human.starships',
      'Starship',
      'Starship.name',
    ],
  },
];

const DROID_SELECTIONS = [
  {
    body: '... on Droid { name primaryFunction }',
    fields: ['Droid', 'Droid.name', 'Droid.primaryFunction'],
  },
  {
    body: '... on Droid { name }',
    fields: ['Droid', 'Droid.name'],
  },
];

const REVIEW_SELECTIONS = [
  { body: 'stars', fields: ['Review', 'Review.stars'] },
  { body: 'stars commentary', fields: ['Review', 'Review.stars', 'Review.commentary'] },
  { body: 'episode stars', fields: ['Review', 'Review.episode', 'Review.stars'] },
  {
    body: 'episode stars commentary',
    fields: ['Review', 'Review.episode', 'Review.stars', 'Review.commentary'],
  },
];

function generateOperations(): OperationDef[] {
  const ops: OperationDef[] = [];
  let idx = 0;

  // 1. Simple hero queries per episode x character selection (3 × 6 = 18)
  for (const ep of EPISODES) {
    for (const sel of CHARACTER_SELECTIONS) {
      const name = `GetHero_${idx++}`;
      ops.push({
        operation: `query ${name} { hero(episode: ${ep}) { ${sel.body} } }`,
        operationName: name,
        fields: ['Query', 'Query.hero', ...sel.fields],
      });
    }
  }

  // 2. Human fragment queries per episode (3 × 4 = 12)
  for (const ep of EPISODES) {
    for (const sel of HUMAN_SELECTIONS) {
      const name = `GetHuman_${idx++}`;
      ops.push({
        operation: `query ${name} { hero(episode: ${ep}) { ${sel.body} } }`,
        operationName: name,
        fields: ['Query', 'Query.hero', ...sel.fields],
      });
    }
  }

  // 3. Droid fragment queries per episode (3 × 2 = 6)
  for (const ep of EPISODES) {
    for (const sel of DROID_SELECTIONS) {
      const name = `GetDroid_${idx++}`;
      ops.push({
        operation: `query ${name} { hero(episode: ${ep}) { ${sel.body} } }`,
        operationName: name,
        fields: ['Query', 'Query.hero', ...sel.fields],
      });
    }
  }

  // 4. Combined Human + Droid queries per episode (3 × 4 × 2 = 24)
  for (const ep of EPISODES) {
    for (const hSel of HUMAN_SELECTIONS) {
      for (const dSel of DROID_SELECTIONS) {
        const name = `GetCharacterDetails_${idx++}`;
        ops.push({
          operation: `query ${name} { hero(episode: ${ep}) { name ${hSel.body} ${dSel.body} } }`,
          operationName: name,
          fields: [
            'Query',
            'Query.hero',
            'Character',
            'Character.name',
            ...hSel.fields,
            ...dSel.fields,
          ],
        });
      }
    }
  }

  // 5. Multi-alias queries — different episode combos (3 choose 2 = 3, with varying selections = ~18)
  const epPairs: [string, string][] = [
    ['NEWHOPE', 'EMPIRE'],
    ['NEWHOPE', 'JEDI'],
    ['EMPIRE', 'JEDI'],
  ];
  for (const [ep1, ep2] of epPairs) {
    for (const sel of CHARACTER_SELECTIONS) {
      const name = `Compare_${idx++}`;
      ops.push({
        operation: `query ${name} { a: hero(episode: ${ep1}) { ${sel.body} } b: hero(episode: ${ep2}) { ${sel.body} } }`,
        operationName: name,
        fields: ['Query', 'Query.hero', ...sel.fields],
      });
    }
  }

  // 6. Triple-alias queries (1 × 6 = 6)
  for (const sel of CHARACTER_SELECTIONS) {
    const name = `AllEpisodeHeroes_${idx++}`;
    ops.push({
      operation: `query ${name} { newhope: hero(episode: NEWHOPE) { ${sel.body} } empire: hero(episode: EMPIRE) { ${sel.body} } jedi: hero(episode: JEDI) { ${sel.body} } }`,
      operationName: name,
      fields: ['Query', 'Query.hero', ...sel.fields],
    });
  }

  // 7. Mutation variations — createReview per episode x review selection (3 × 4 = 12)
  const STARS = [1, 2, 3, 4, 5];
  for (const ep of EPISODES) {
    for (const sel of REVIEW_SELECTIONS) {
      const name = `CreateReview_${idx++}`;
      const stars = STARS[idx % STARS.length];
      ops.push({
        operation: `mutation ${name} { createReview(episode: ${ep}, review: { stars: ${stars} }) { ${sel.body} } }`,
        operationName: name,
        fields: ['Mutation', 'Mutation.createReview', ...sel.fields],
      });
    }
  }

  // 8. Generate more unique queries to reach ~1000 by varying naming patterns
  // Simulate realistic operation names like a real codebase would have
  const PREFIXES = [
    'Dashboard',
    'Settings',
    'Profile',
    'Analytics',
    'Admin',
    'Reporting',
    'Monitor',
    'Search',
    'Feed',
    'Notification',
    'Billing',
    'Team',
    'Onboarding',
    'Export',
    'Import',
    'Audit',
    'Cache',
    'Sync',
    'Batch',
    'Stream',
  ];
  const SUFFIXES = [
    'Query',
    'Fetch',
    'Load',
    'Get',
    'List',
    'Detail',
    'Summary',
    'Overview',
    'Stats',
    'Count',
  ];

  while (ops.length < 1000) {
    const prefix = PREFIXES[idx % PREFIXES.length];
    const suffix = SUFFIXES[Math.floor(idx / PREFIXES.length) % SUFFIXES.length];
    const ep = EPISODES[idx % 3];
    const charSel = CHARACTER_SELECTIONS[idx % CHARACTER_SELECTIONS.length];
    const name = `${prefix}${suffix}_${idx++}`;
    ops.push({
      operation: `query ${name} { hero(episode: ${ep}) { ${charSel.body} } }`,
      operationName: name,
      fields: ['Query', 'Query.hero', ...charSel.fields],
    });
  }

  return ops;
}

const OPERATIONS = generateOperations();

// ---------------------------------------------------------------------------
// 2. Clients — 7 clients with 0–30 versions each
// ---------------------------------------------------------------------------

interface ClientDef {
  name: string;
  versions: string[];
  weight: number; // relative traffic weight
}

function generateVersions(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}.${i}.0`);
}

const CLIENTS: ClientDef[] = [
  { name: 'web-app', versions: generateVersions('1', 15), weight: 30 },
  { name: 'ios-app', versions: generateVersions('2', 25), weight: 25 },
  { name: 'android-app', versions: generateVersions('3', 10), weight: 15 },
  { name: 'graphql-playground', versions: [], weight: 5 },
  { name: 'admin-dashboard', versions: generateVersions('1', 5), weight: 8 },
  { name: 'mobile-bff', versions: generateVersions('0', 30), weight: 12 },
  { name: 'analytics-worker', versions: generateVersions('1', 8), weight: 5 },
];

const TOTAL_WEIGHT = CLIENTS.reduce((s, c) => s + c.weight, 0);

function pickWeightedClient(): { name: string; version: string | undefined } {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const client of CLIENTS) {
    r -= client.weight;
    if (r <= 0) {
      const version =
        client.versions.length > 0
          ? client.versions[Math.floor(Math.random() * client.versions.length)]
          : undefined;
      return { name: client.name, version };
    }
  }
  // fallback
  return { name: CLIENTS[0].name, version: CLIENTS[0].versions[0] };
}

function randomDuration(): number {
  // 50ms to 2s in nanoseconds, with most clustering around 100-500ms
  const base = 50 + Math.random() * 450; // 50-500ms
  const spike = Math.random() < 0.1 ? Math.random() * 1500 : 0; // 10% chance of slow
  return Math.round((base + spike) * 1_000_000); // convert ms → ns
}

function randomOperation() {
  return OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)];
}

// ---------------------------------------------------------------------------
// 3. Schema SDL (Star Wars mono — matches scripts/seed-schemas/mono.graphql)
// ---------------------------------------------------------------------------

const SCHEMA_SDL = `
interface Node { id: ID! }
interface Character implements Node { id: ID! name: String! friends: [Character] appearsIn: [Episode]! }
type Human implements Character & Node { id: ID! name: String! friends: [Character] appearsIn: [Episode]! starships: [Starship] totalCredits: Int }
type Droid implements Character & Node { id: ID! name: String! friends: [Character] appearsIn: [Episode]! primaryFunction: String }
type Starship { id: ID! name: String! length(unit: LengthUnit = METER): Float }
enum LengthUnit { METER LIGHT_YEAR }
enum Episode { NEWHOPE EMPIRE JEDI }
type Query { hero(episode: Episode): Character }
type Review { episode: Episode stars: Int! commentary: String }
input ReviewInput { stars: Int! commentary: String }
type Mutation { createReview(episode: Episode, review: ReviewInput!): Review }
`.trim();

// ---------------------------------------------------------------------------
// 4. Prompt + Main
// ---------------------------------------------------------------------------

const BATCH_SIZE = 500;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

async function promptForEmail(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const email = await rl.question('Enter owner email (or press Enter to auto-generate): ');
    return email.trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const inputEmail = await promptForEmail();
  const ownerEmail = inputEmail || `${generateUnique()}-${Date.now()}@localhost.localhost`;

  console.log(`\n🚀 Creating owner (${ownerEmail}), org, project...`);
  const auth = await signInOrSignUp(ownerEmail);
  const ownerToken = auth.access_token;

  // Create organization
  const orgSlug = generateUnique();
  const orgResult = await createOrganization({ slug: orgSlug }, ownerToken).then(r =>
    r.expectNoGraphQLErrors(),
  );
  const organization = orgResult.createOrganization.ok!.createdOrganizationPayload.organization;

  // Create project
  const projectResult = await createProject(
    {
      organization: { bySelector: { organizationSlug: organization.slug } },
      type: ProjectType.Single,
      slug: generateUnique(),
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  const project = projectResult.createProject.ok!.createdProject;
  const target = projectResult.createProject.ok!.createdTargets[0];

  console.log(`   Org: ${organization.slug}`);
  console.log(`   Project: ${project.slug}`);
  console.log(`   Target: ${target.slug}`);

  // Create access token
  console.log('📝 Publishing schema...');
  const tokenResult = await createToken(
    {
      name: generateUnique(),
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      targetSlug: target.slug,
      organizationScopes: [],
      projectScopes: [],
      targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  const secret = tokenResult.createToken.ok!.secret;

  const publishResult = await publishSchema(
    {
      author: 'seed-insights',
      commit: 'seed',
      sdl: SCHEMA_SDL,
      force: true,
    },
    secret,
    'authorization',
  );
  if (publishResult.rawBody.errors?.length) {
    console.error('Schema publish failed:', publishResult.rawBody.errors);
    process.exit(1);
  }
  console.log('   Schema published successfully.');

  // Generate operations spread across 30 days
  console.log('📊 Generating usage data (30 days)...');
  const now = Date.now();
  const allOperations: CollectedOperation[] = [];

  for (let t = now - THIRTY_DAYS_MS; t <= now; t += ONE_HOUR_MS) {
    const opsThisHour = 3 + Math.floor(Math.random() * 6); // 3–8 per hour
    for (let i = 0; i < opsThisHour; i++) {
      const op = randomOperation();
      const client = pickWeightedClient();
      const ok = Math.random() > 0.05;
      allOperations.push({
        timestamp: t + Math.floor(Math.random() * ONE_HOUR_MS),
        operation: op.operation,
        operationName: op.operationName,
        fields: op.fields,
        execution: {
          ok,
          duration: randomDuration(),
          errorsTotal: ok ? 0 : 1,
        },
        metadata: {
          client: {
            name: client.name,
            ...(client.version ? { version: client.version } : {}),
          },
        },
      });
    }
  }

  console.log(`   Generated ${allOperations.length} operations across 30 days.`);

  // Send in batches
  const totalBatches = Math.ceil(allOperations.length / BATCH_SIZE);
  for (let i = 0; i < allOperations.length; i += BATCH_SIZE) {
    const batch = allOperations.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`   Sending batch ${batchNum}/${totalBatches}...`);
    const result = await legacyCollect({
      operations: batch,
      token: secret,
      authorizationHeader: 'authorization',
    });
    if (result.status !== 200) {
      console.error(` FAILED (status ${result.status}):`, result.body);
    } else {
      const body = result.body as { operations: { accepted: number; rejected: number } };
      console.log(` ✓ ${body.operations.accepted} accepted, ${body.operations.rejected} rejected`);
    }
  }

  // Wait for ingestion
  console.log('⏳ Waiting for usage ingestion (15s)...');
  await new Promise(resolve => setTimeout(resolve, 15_000));

  // Helper for saved filter operations
  const targetSelector = {
    organizationSlug: organization.slug,
    projectSlug: project.slug,
    targetSlug: target.slug,
  };

  // Fetch actual operation hashes from ingested data
  console.log('🔍 Fetching operation hashes...');
  const { parse } = await import('graphql');
  const opsResult = await execute({
    document: parse(/* GraphQL */ `
      query SeedGetOperationHashes($target: TargetReferenceInput!, $period: DateRangeInput!) {
        target(reference: $target) {
          operationsStats(period: $period) {
            operations {
              edges {
                node {
                  name
                  operationHash
                }
              }
            }
          }
        }
      }
    `) as any,
    variables: {
      target: { bySelector: targetSelector },
      period: {
        from: new Date(now - THIRTY_DAYS_MS).toISOString(),
        to: new Date(now).toISOString(),
      },
    },
    authToken: ownerToken,
  }).then(r => r.expectNoGraphQLErrors());

  type OpsResult = {
    target?: {
      operationsStats?: {
        operations?: {
          edges: Array<{ node: { name: string; operationHash: string | null } }>;
        };
      };
    };
  };
  const operationEdges = (opsResult as OpsResult).target?.operationsStats?.operations?.edges ?? [];
  const operationHashMap = new Map<string, string>();
  for (const edge of operationEdges) {
    if (edge.node.operationHash && edge.node.name) {
      // API returns names as "{hashPrefix}_{operationName}", extract the operationName part
      const underscoreIdx = edge.node.name.indexOf('_');
      const operationName =
        underscoreIdx >= 0 ? edge.node.name.slice(underscoreIdx + 1) : edge.node.name;
      operationHashMap.set(operationName, edge.node.operationHash);
    }
  }
  console.log(
    `   Found ${operationHashMap.size} operations: ${[...operationHashMap.keys()].join(', ')}`,
  );

  async function createSavedFilter(input: {
    name: string;
    description?: string;
    visibility: (typeof SavedFilterVisibilityType)[keyof typeof SavedFilterVisibilityType];
    insightsFilter?: Record<string, unknown>;
  }) {
    const result = await execute({
      document: CreateSavedFilterMutation,
      variables: {
        input: {
          target: { bySelector: targetSelector },
          name: input.name,
          description: input.description,
          visibility: input.visibility,
          insightsFilter: input.insightsFilter,
        },
      },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());

    return result.createSavedFilter;
  }

  async function trackSavedFilterView(filterId: string) {
    await execute({
      document: TrackSavedFilterViewMutation,
      variables: {
        input: {
          target: { bySelector: targetSelector },
          id: filterId,
        },
      },
      authToken: ownerToken,
    }).then(r => r.expectNoGraphQLErrors());
  }

  // Create saved filters using real operation hashes
  console.log('💾 Creating saved filters...');

  // Helper to resolve operation names to hashes
  function resolveOps(names: string[]): string[] {
    return names.map(name => operationHashMap.get(name)).filter((h): h is string => h != null);
  }

  // Collect all known operation names for building saved filters
  const allOpNames = [...operationHashMap.keys()];
  console.log(`   Using ${allOpNames.length} resolved operations for saved filters`);

  // Define all saved filters (using slices of the resolved operation names)
  const savedFilterDefs: Array<{
    name: string;
    description?: string;
    visibility: (typeof SavedFilterVisibilityType)[keyof typeof SavedFilterVisibilityType];
    operationNames: string[];
    clientFilters?: Array<{ name: string; versions?: string[] }>;
    dateRange?: { from: string; to: string };
    views: number;
  }> = [
    {
      name: 'High Traffic Operations',
      description: 'Most frequently called queries',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(0, 20),
      clientFilters: [{ name: 'web-app' }, { name: 'ios-app' }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 372,
    },
    {
      name: 'Mobile Clients',
      description: 'iOS and Android traffic',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(10, 25),
      clientFilters: [
        { name: 'ios-app', versions: ['2.0.0', '2.5.0', '2.10.0', '2.20.0'] },
        { name: 'android-app', versions: ['3.0.0', '3.5.0', '3.9.0'] },
      ],
      dateRange: { from: 'now-30d', to: 'now' },
      views: 156,
    },
    {
      name: 'My Debug View',
      description: 'Debugging slow mutations',
      visibility: SavedFilterVisibilityType.Private,
      operationNames: allOpNames.slice(30, 35),
      clientFilters: [{ name: 'graphql-playground' }],
      dateRange: { from: 'now-1d', to: 'now' },
      views: 23,
    },
    {
      name: 'Web App — All Queries',
      description: 'All query operations from the web app',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(0, 50),
      clientFilters: [{ name: 'web-app' }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 241,
    },
    {
      name: 'Mutations Only',
      description: 'All mutation operations across all clients',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.filter(n => n.startsWith('CreateReview')),
      dateRange: { from: 'now-14d', to: 'now' },
      views: 89,
    },
    {
      name: 'Admin Dashboard',
      description: 'Operations from the admin dashboard client',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.filter(n => n.startsWith('Dashboard')),
      clientFilters: [{ name: 'admin-dashboard' }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 64,
    },
    {
      name: 'BFF Layer',
      description: 'Mobile BFF service traffic',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(50, 80),
      clientFilters: [{ name: 'mobile-bff' }],
      dateRange: { from: 'now-30d', to: 'now' },
      views: 118,
    },
    {
      name: 'Error Investigation',
      description: 'Operations with known error patterns',
      visibility: SavedFilterVisibilityType.Private,
      operationNames: allOpNames.slice(80, 90),
      clientFilters: [{ name: 'android-app', versions: ['3.0.0'] }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 7,
    },
    {
      name: 'Character Detail Queries',
      description: 'All character detail operations',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.filter(n => n.startsWith('GetCharacterDetails')),
      dateRange: { from: 'now-90d', to: 'now' },
      views: 195,
    },
    {
      name: 'Deep Queries',
      description: 'Queries with nested friend relationships',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(3, 8),
      dateRange: { from: 'now-14d', to: 'now' },
      views: 43,
    },
    {
      name: 'iOS Latest Versions',
      description: 'Recent iOS app versions only',
      visibility: SavedFilterVisibilityType.Private,
      operationNames: allOpNames.slice(0, 15),
      clientFilters: [{ name: 'ios-app', versions: ['2.20.0', '2.24.0'] }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 31,
    },
    {
      name: 'Analytics Worker',
      description: 'Background analytics service operations',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.filter(n => n.startsWith('Analytics')),
      clientFilters: [{ name: 'analytics-worker' }],
      dateRange: { from: 'now-30d', to: 'now' },
      views: 12,
    },
    {
      name: 'Playground Exploration',
      description: 'Ad-hoc queries from GraphQL Playground',
      visibility: SavedFilterVisibilityType.Private,
      operationNames: allOpNames.slice(100, 120),
      clientFilters: [{ name: 'graphql-playground' }],
      dateRange: { from: 'now-1d', to: 'now' },
      views: 5,
    },
    {
      name: 'Droid & Human Types',
      description: 'Operations touching Droid and Human types',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: [
        ...allOpNames.filter(n => n.startsWith('GetDroid')),
        ...allOpNames.filter(n => n.startsWith('GetHuman')),
      ],
      dateRange: { from: 'now-14d', to: 'now' },
      views: 77,
    },
    {
      name: 'Production Canary',
      description: 'Canary release monitoring — latest client versions',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(0, 10),
      clientFilters: [
        { name: 'web-app', versions: ['1.14.0'] },
        { name: 'ios-app', versions: ['2.24.0'] },
        { name: 'android-app', versions: ['3.9.0'] },
      ],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 203,
    },
  ];

  // Create all filters and collect results
  const createdFilters: Array<{ name: string; id: string; views: number }> = [];
  for (const def of savedFilterDefs) {
    const ops = resolveOps(def.operationNames);
    const result = await createSavedFilter({
      name: def.name,
      description: def.description,
      visibility: def.visibility,
      insightsFilter: {
        operationHashes: ops,
        ...(def.clientFilters ? { clientFilters: def.clientFilters } : {}),
        ...(def.dateRange ? { dateRange: def.dateRange } : {}),
      },
    });
    if (result.ok) {
      createdFilters.push({ name: def.name, id: result.ok.savedFilter.id, views: def.views });
      console.log(
        `   Created: "${def.name}" (${result.ok.savedFilter.id}) — ${ops.length} ops, ${def.visibility}`,
      );
    } else {
      console.error(`   Failed to create "${def.name}"`);
    }
  }

  // Track views to populate view counts
  console.log(`👁️  Tracking views for ${createdFilters.length} filters...`);
  for (const filter of createdFilters) {
    for (let i = 0; i < filter.views; i++) {
      await trackSavedFilterView(filter.id);
    }
    console.log(`   "${filter.name}": ${filter.views} views`);
  }

  console.log(`
✅ Seed complete!

Credentials:
  Email:    ${ownerEmail}
  Password: ${password}

Navigate to:
  http://localhost:3000/${organization.slug}/${project.slug}/${target.slug}/insights
  http://localhost:3000/${organization.slug}/${project.slug}/${target.slug}/insights/manage-filters
`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
