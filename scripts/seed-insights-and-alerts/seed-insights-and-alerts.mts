/**
 * Seeds data for the Insights and Alerts features.
 *
 * Creates the supporting context (owner account, org, project, target, schema)
 * plus the data the two features render: ~30 days of operations, saved
 * filters with view counts, alert channels, metric alert rules (all types),
 * and 30 days of historical alert state transitions + incidents.
 *
 * Architecture — metric-first signal generation
 * ---------------------------------------------
 * For each alert rule, the script first plans a list of incident windows
 * (`buildRuleSignals`) and then generates per-minute ClickHouse operations that
 * make the rule's metric *actually* breach its threshold during those windows
 * (`signalToOps`). Postgres state-log + incident rows are emitted from those
 * same windows, so the chart, status bar, and events table on the alert detail
 * page all derive from one shared timeline. See `ruleShapes` (lines ~1150) and
 * the alert-history phase (lines ~1810) for details.
 *
 * Prerequisites:
 *   - Docker Compose is running (pnpm local:setup)
 *   - Services are running (pnpm dev:hive)
 *
 * Usage:
 *   pnpm seed:insights-and-alerts
 *
 * See `scripts/seed-insights-and-alerts/README.md` for the env-var
 * configuration knobs (SEED_DAYS_PAST, SEED_DAYS_AHEAD, SEED_RULE_LIMIT,
 * SEED_BATCH_SIZE) and full usage notes.
 */

import 'reflect-metadata';
import * as readline from 'node:readline/promises';
import type { CollectedOperation } from '../../integration-tests/testkit/usage';

process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
await import('../../integration-tests/local-dev.ts');

const { createPostgresDatabasePool, psql } = await import('@hive/postgres');
const { authenticate } = await import('../../integration-tests/testkit/auth');
const { ensureEnv } = await import('../../integration-tests/testkit/env');
const {
  addAlertChannel,
  addMetricAlertRule,
  createOrganization,
  createProject,
  createToken,
  publishSchema,
} = await import('../../integration-tests/testkit/flow');
const { execute } = await import('../../integration-tests/testkit/graphql');
const { legacyCollect } = await import('../../integration-tests/testkit/usage');
const { generateUnique } = await import('../../integration-tests/testkit/utils');
const {
  AlertChannelType,
  MetricAlertRuleDirection,
  MetricAlertRuleMetric,
  MetricAlertRuleSeverity,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
  ProjectType,
  SavedFilterVisibilityType,
  TargetAccessScope,
} = await import('../../integration-tests/testkit/gql/graphql');
const { CreateSavedFilterMutation, TrackSavedFilterViewMutation } = await import(
  '../../integration-tests/testkit/saved-filters'
);

// ---------------------------------------------------------------------------
// Auth helper — creates a new user or creates a session for an existing one
// ---------------------------------------------------------------------------

const password = 'ilikebigturtlesandicannotlie47';

function getSeedPGConnectionString() {
  const pg = {
    user: ensureEnv('POSTGRES_USER'),
    password: ensureEnv('POSTGRES_PASSWORD'),
    host: ensureEnv('POSTGRES_HOST'),
    port: ensureEnv('POSTGRES_PORT'),
    db: ensureEnv('POSTGRES_DB'),
  };
  return `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.db}?sslmode=disable`;
}

async function getOrCreateAuth(
  email: string,
): Promise<{ access_token: string; refresh_token: string; isExistingUser: boolean }> {
  const pool = await createPostgresDatabasePool({
    connectionParameters: getSeedPGConnectionString(),
  });
  try {
    // Check if the user already exists
    const existingUserId = await pool.maybeOneFirst(psql`
      SELECT "user_id" FROM "supertokens_emailpassword_users"
      WHERE "app_id" = 'public' AND "email" = lower(${email})
    `);

    if (existingUserId) {
      // Existing user — create a session directly without signup
      console.log(`   Found existing user: ${email}`);
      const { SuperTokensStore } = await import(
        '@hive/api/modules/auth/providers/supertokens-store'
      );
      const { NoopLogger } = await import('@hive/api/modules/shared/providers/logger');
      const { AccessTokenKeyContainer } = await import(
        '@hive/api/modules/auth/lib/supertokens-at-home/crypto'
      );
      const { createNewSession } = await import('@hive/server/supertokens-at-home/shared');
      const { createTRPCProxyClient, httpLink } = await import('@trpc/client');
      const { getServiceHost } = await import('../../integration-tests/testkit/utils');
      const graphqlAddress = await getServiceHost('server', 8082);

      type InternalApi = import('@hive/server').InternalApi;
      const internalApi = createTRPCProxyClient<InternalApi>({
        links: [httpLink({ url: `http://${graphqlAddress}/trpc`, fetch })],
      });

      const ensureUserResult = await internalApi.ensureUser.mutate({
        superTokensUserId: existingUserId as string,
        email,
        oidcIntegrationId: null,
        firstName: null,
        lastName: null,
      });
      if (!ensureUserResult.ok) {
        throw new Error(`ensureUser failed: ${ensureUserResult.reason}`);
      }

      const supertokensStore = new SuperTokensStore(pool, new NoopLogger());
      const session = await createNewSession(
        supertokensStore,
        {
          superTokensUserId: existingUserId as string,
          hiveUser: ensureUserResult.user,
          oidcIntegrationId: null,
        },
        {
          refreshTokenKey: process.env.SUPERTOKENS_REFRESH_TOKEN_KEY!,
          accessTokenKey: new AccessTokenKeyContainer(process.env.SUPERTOKENS_ACCESS_TOKEN_KEY!),
        },
      );

      return {
        access_token: session.accessToken.token,
        refresh_token: session.refreshToken,
        isExistingUser: true,
      };
    }

    // New user — authenticate creates the user + session
    const auth = await authenticate(pool, email);
    return {
      access_token: auth.access_token,
      refresh_token: auth.refresh_token,
      isExistingUser: false,
    };
  } finally {
    await pool.end();
  }
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
  // Mix of short and long prefixes to test truncation at varying widths
  const PREFIXES = [
    'Dashboard',
    'Settings',
    'Profile',
    'Admin',
    'Search',
    'Feed',
    'Sync',
    'OrganizationBillingSubscriptionDetails',
    'TargetSchemaVersionComparison',
    'ProjectAccessTokenPermissionsManagement',
    'UserNotificationPreferencesUpdate',
    'SchemaRegistryExplorerTypeDetails',
    'IntegrationWebhookDeliveryStatus',
    'AlertChannelConfigurationValidation',
    'PersistedOperationCollectionSync',
    'GraphQLEndpointLatencyPercentiles',
    'CDNAccessTokenRotation',
    'SchemaContractCompositionValidation',
    'MemberRoleAssignmentAuditLog',
    'OperationBodyNormalizationPreview',
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
    'WithPaginationAndFilters',
    'ByOrganizationSlug',
    'ForDateRangeComparison',
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

// Mix of short and long client names to test truncation at varying widths
const CLIENTS: ClientDef[] = [
  { name: 'web-app', versions: generateVersions('1', 15), weight: 30 },
  { name: 'ios', versions: generateVersions('2', 25), weight: 25 },
  { name: 'android', versions: generateVersions('3', 10), weight: 15 },
  { name: 'graphql-playground', versions: [], weight: 5 },
  { name: 'admin-dashboard-internal-tools', versions: generateVersions('1', 5), weight: 8 },
  {
    name: 'mobile-backend-for-frontend-service',
    versions: generateVersions('0', 30),
    weight: 12,
  },
  { name: 'analytics-pipeline-worker-v2', versions: generateVersions('1', 8), weight: 5 },
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

// ---------------------------------------------------------------------------
// Env-driven configuration knobs (see scripts/seed-insights-and-alerts/README.md)
// ---------------------------------------------------------------------------
const SEED_DAYS_PAST = Number(process.env.SEED_DAYS_PAST ?? 30);
const SEED_DAYS_AHEAD = Number(process.env.SEED_DAYS_AHEAD ?? 7);
const SEED_BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE ?? 500);
const SEED_RULE_LIMIT = process.env.SEED_RULE_LIMIT ? Number(process.env.SEED_RULE_LIMIT) : null;

const BATCH_SIZE = SEED_BATCH_SIZE;
const THIRTY_DAYS_MS = SEED_DAYS_PAST * 24 * 60 * 60 * 1000;
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
  const auth = await getOrCreateAuth(ownerEmail);
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

  // ──── Signal planning (runs before baseline generation) ────────────────────
  //
  // Rule shapes (metric/threshold/direction/etc.) are defined independently of
  // channel IDs so signal plans can be computed up-front. Channel IDs are
  // resolved later when the GraphQL rules are created. Pre-planned signals drive:
  //   1. TRAFFIC-Below suppression windows — minutes within these ranges skip
  //      baseline op emission so the rule's rolling sum actually drops
  //   2. Per-rule signal ops emitted later (metric-aware breach injections)
  //   3. Postgres state_log + incident rows written after rule creation

  type DesiredState = 'NORMAL' | 'PENDING' | 'FIRING' | 'RECOVERING';

  /**
   * The narrative shape of a rule's incident history. Each scenario controls how many
   * past incidents the rule had, how long they typically lasted, how aggressive the
   * breach was, and whether they cluster around business hours.
   */
  type IncidentScenario =
    /** 1–2 long incidents (1–4 hr). Critical outages that bring everything down. */
    | 'rare_long'
    /** 6–10 short incidents (15–45 min). Flapping warnings, transient blips. */
    | 'frequent_short'
    /** 2–4 incidents lasting 45 min – 3 hr. Slow degradations under load. */
    | 'sustained'
    /** 2–4 incidents of varied duration (30–120 min). General "info" pattern. */
    | 'occasional'
    /** 4–7 short bursts (5–20 min) at high intensity. DDoS / acute spikes. */
    | 'spiky'
    /** 6–9 moderate incidents (30–90 min) clustered in 9 AM – 5 PM UTC. */
    | 'business_hours'
    /** 3–6 incidents starting Saturday or Sunday UTC (1–6 hr). Weekend traffic drops. */
    | 'weekend_dip'
    /** 2–4 short incidents starting 0–30 min after scripted deploy anchors (Tue/Thu 14:00 UTC). */
    | 'post_deploy'
    /** 5–7 incidents whose duration and intensity grow over time. "Getting worse." */
    | 'degrading_trend';

  type AlertRuleShape = {
    name: string;
    type: MetricAlertRuleType;
    metric?: MetricAlertRuleMetric;
    timeWindowMinutes: number;
    thresholdType: MetricAlertRuleThresholdType;
    thresholdValue: number;
    direction: MetricAlertRuleDirection;
    severity: MetricAlertRuleSeverity;
    desiredState: DesiredState;
    channelKeys: Array<'slack' | 'webhook'>;
    confirmationMinutes?: number;
    /** Narrative driver for past incident pattern. */
    scenario: IncidentScenario;
  };

  const SCENARIO_PROFILES: Record<
    IncidentScenario,
    {
      countRange: [number, number];
      durationMinutesRange: [number, number];
      intensityRange: [number, number];
      preferBusinessHours: boolean;
      /** If set, only accept start times where the UTC day-of-week is in this set. */
      preferDayOfWeek?: number[];
    }
  > = {
    rare_long: {
      countRange: [1, 2],
      durationMinutesRange: [60, 240],
      intensityRange: [1.6, 2.5],
      preferBusinessHours: false,
    },
    frequent_short: {
      countRange: [6, 10],
      durationMinutesRange: [15, 45],
      intensityRange: [1.3, 1.8],
      preferBusinessHours: false,
    },
    sustained: {
      countRange: [2, 4],
      durationMinutesRange: [45, 180],
      intensityRange: [1.4, 2.2],
      preferBusinessHours: false,
    },
    occasional: {
      countRange: [2, 4],
      durationMinutesRange: [30, 120],
      intensityRange: [1.4, 2.0],
      preferBusinessHours: false,
    },
    spiky: {
      countRange: [4, 7],
      durationMinutesRange: [5, 20],
      intensityRange: [1.6, 2.5],
      preferBusinessHours: false,
    },
    business_hours: {
      countRange: [6, 9],
      durationMinutesRange: [30, 90],
      intensityRange: [1.4, 2.0],
      preferBusinessHours: true,
    },
    weekend_dip: {
      countRange: [3, 6],
      durationMinutesRange: [60, 360],
      intensityRange: [1.3, 2.0],
      preferBusinessHours: false,
      preferDayOfWeek: [0, 6], // Sunday + Saturday
    },
    post_deploy: {
      countRange: [2, 4],
      durationMinutesRange: [15, 60],
      intensityRange: [1.4, 2.2],
      preferBusinessHours: false,
    },
    degrading_trend: {
      // Custom-built — countRange used; duration/intensity scale by slot index.
      countRange: [5, 7],
      durationMinutesRange: [20, 180],
      intensityRange: [1.3, 2.5],
      preferBusinessHours: false,
    },
  };

  const ALERT_DAYS_PAST = SEED_DAYS_PAST;
  const ALERT_DAYS_AHEAD = SEED_DAYS_AHEAD;
  const BASELINE_OPS_PER_HOUR = 60;
  const MINUTE_MS = 60_000;
  const nowMs = Date.now();

  function randBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
  function randInt(min: number, max: number): number {
    return Math.floor(randBetween(min, max + 1));
  }

  type SignalWindow = {
    startMin: number;
    endMin: number;
    intensity: number;
  };

  type SignalPlan = {
    windows: SignalWindow[];
    finalState: DesiredState;
    finalStateChangedMin: number;
    lastTriggeredMin: number | null;
  };

  /**
   * Build past incident windows according to the rule's scenario profile. Windows
   * are placed in time slots so they don't overlap. The trailing 2 days are
   * reserved for the final-state anchor window.
   */
  function buildScenarioWindows(def: AlertRuleShape): SignalWindow[] {
    if (def.scenario === 'post_deploy') return buildPostDeployWindows(def);
    if (def.scenario === 'degrading_trend') return buildDegradingTrendWindows(def);
    if (def.scenario === 'weekend_dip') return buildWeekendDipWindows(def);

    const profile = SCENARIO_PROFILES[def.scenario];
    const count = randInt(profile.countRange[0], profile.countRange[1]);

    // Pastable region: from 30 days ago up to 2 days ago (in minutes).
    const earliestMinAbs = ALERT_DAYS_PAST * 24 * 60;
    const latestMinAbs = 2 * 24 * 60;
    const slotSize = (earliestMinAbs - latestMinAbs) / count;

    const windows: SignalWindow[] = [];
    for (let i = 0; i < count; i++) {
      const slotEnd = earliestMinAbs - i * slotSize;
      const slotStart = slotEnd - slotSize;
      const duration = randInt(profile.durationMinutesRange[0], profile.durationMinutesRange[1]);
      const intensity = randBetween(profile.intensityRange[0], profile.intensityRange[1]);

      let startMinAbs = randBetween(slotStart + duration, slotEnd);

      // Retry up to 10 times to match business-hours / day-of-week preferences.
      if (profile.preferBusinessHours || profile.preferDayOfWeek) {
        for (let attempt = 0; attempt < 10; attempt++) {
          const candidate = -Math.floor(startMinAbs);
          const candidateDate = new Date(minOffsetToMs(candidate));
          const hour = candidateDate.getUTCHours();
          const day = candidateDate.getUTCDay();
          const hoursOk = !profile.preferBusinessHours || (hour >= 9 && hour <= 17);
          const dayOk = !profile.preferDayOfWeek || profile.preferDayOfWeek.includes(day);
          if (hoursOk && dayOk) break;
          startMinAbs = randBetween(slotStart + duration, slotEnd);
        }
      }

      const startMin = -Math.floor(startMinAbs);
      windows.push({ startMin, endMin: startMin + duration, intensity });
    }

    // Sort ascending by startMin (oldest first)
    windows.sort((a, b) => a.startMin - b.startMin);
    return windows;
  }

  /**
   * Post-deploy scenario: incidents cluster 0–30 min after scripted deploy anchors
   * (every Tuesday and Thursday at 14:00 UTC within the past 30 days).
   */
  function buildPostDeployWindows(def: AlertRuleShape): SignalWindow[] {
    const profile = SCENARIO_PROFILES[def.scenario];
    const count = randInt(profile.countRange[0], profile.countRange[1]);

    // Compute all deploy anchors in the past 30 days: Tue (2) and Thu (4) at 14:00 UTC.
    const anchors: number[] = []; // minute offsets (negative = past)
    for (let daysAgo = 2; daysAgo <= ALERT_DAYS_PAST; daysAgo++) {
      const candidateDate = new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000);
      const dow = candidateDate.getUTCDay();
      if (dow !== 2 && dow !== 4) continue;
      // Set to 14:00 UTC on that date
      const anchorDate = new Date(
        Date.UTC(
          candidateDate.getUTCFullYear(),
          candidateDate.getUTCMonth(),
          candidateDate.getUTCDate(),
          14,
        ),
      );
      const offsetMin = Math.floor((anchorDate.getTime() - nowMs) / MINUTE_MS);
      anchors.push(offsetMin);
    }

    // Shuffle and pick `count` anchors
    anchors.sort(() => Math.random() - 0.5);
    const picked = anchors.slice(0, Math.min(count, anchors.length));

    const windows: SignalWindow[] = picked.map(anchorMin => {
      const duration = randInt(profile.durationMinutesRange[0], profile.durationMinutesRange[1]);
      const startMin = anchorMin + randInt(0, 30); // 0–30 min after deploy
      const intensity = randBetween(profile.intensityRange[0], profile.intensityRange[1]);
      return { startMin, endMin: startMin + duration, intensity };
    });

    windows.sort((a, b) => a.startMin - b.startMin);
    return windows;
  }

  /**
   * Weekend-dip scenario: generates candidate weekend-night anchors (Sat 22:00 UTC
   * and Sun 02:00 UTC) across the past 30 days, picks a subset, and places the
   * incident starting at the anchor.
   */
  function buildWeekendDipWindows(def: AlertRuleShape): SignalWindow[] {
    const profile = SCENARIO_PROFILES[def.scenario];
    const count = randInt(profile.countRange[0], profile.countRange[1]);

    const anchors: number[] = [];
    for (let daysAgo = 2; daysAgo <= ALERT_DAYS_PAST; daysAgo++) {
      const candidateDate = new Date(nowMs - daysAgo * 24 * 60 * 60 * 1000);
      const dow = candidateDate.getUTCDay();
      if (dow !== 0 && dow !== 6) continue;
      // Anchor at 23:00 UTC on the weekend day — traffic typically dips at night.
      const anchorDate = new Date(
        Date.UTC(
          candidateDate.getUTCFullYear(),
          candidateDate.getUTCMonth(),
          candidateDate.getUTCDate(),
          23,
        ),
      );
      const offsetMin = Math.floor((anchorDate.getTime() - nowMs) / MINUTE_MS);
      anchors.push(offsetMin);
    }

    anchors.sort(() => Math.random() - 0.5);
    const picked = anchors.slice(0, Math.min(count, anchors.length));

    const windows: SignalWindow[] = picked.map(anchorMin => {
      const duration = randInt(profile.durationMinutesRange[0], profile.durationMinutesRange[1]);
      const startMin = anchorMin + randInt(-60, 60); // within an hour of 23:00
      const intensity = randBetween(profile.intensityRange[0], profile.intensityRange[1]);
      return { startMin, endMin: startMin + duration, intensity };
    });

    windows.sort((a, b) => a.startMin - b.startMin);
    return windows;
  }

  /**
   * Degrading-trend scenario: duration and intensity scale up with incident index so
   * the oldest incident is the mildest/shortest and the newest is the worst/longest.
   */
  function buildDegradingTrendWindows(def: AlertRuleShape): SignalWindow[] {
    const profile = SCENARIO_PROFILES[def.scenario];
    const count = randInt(profile.countRange[0], profile.countRange[1]);

    const earliestMinAbs = ALERT_DAYS_PAST * 24 * 60;
    const latestMinAbs = 2 * 24 * 60;
    const slotSize = (earliestMinAbs - latestMinAbs) / count;

    const [dMin, dMax] = profile.durationMinutesRange;
    const [iMin, iMax] = profile.intensityRange;

    const windows: SignalWindow[] = [];
    for (let i = 0; i < count; i++) {
      // Slot i=0 is the OLDEST slot (furthest in the past), i=count-1 is the newest.
      // slotEnd is `earliestMinAbs` for i=0 (30 days ago) and decreases as i grows.
      const slotEnd = earliestMinAbs - i * slotSize;
      const slotStart = slotEnd - slotSize;

      // progress: 0 for the oldest incident (mild), 1 for the newest (severe).
      const progress = i / Math.max(1, count - 1);
      const duration = Math.floor(dMin + (dMax - dMin) * progress);
      const intensity = iMin + (iMax - iMin) * progress;

      const startMinAbs = randBetween(slotStart + duration, slotEnd);
      const startMin = -Math.floor(startMinAbs);
      windows.push({ startMin, endMin: startMin + duration, intensity });
    }

    windows.sort((a, b) => a.startMin - b.startMin);
    return windows;
  }

  function buildRuleSignals(def: AlertRuleShape): SignalPlan {
    const conf = Math.max(def.confirmationMinutes ?? 0, 1);

    // Past incidents driven by the scenario profile.
    const windows = buildScenarioWindows(def);

    // Anchor window for non-NORMAL final state.
    let finalState: DesiredState = 'NORMAL';
    let finalStateChangedMin = windows[windows.length - 1]?.endMin ?? -24 * 60;

    if (def.desiredState === 'PENDING') {
      const startMin = -randInt(1, Math.max(1, Math.floor(conf / 2)));
      const endMin = startMin + randInt(30, 120);
      windows.push({ startMin, endMin, intensity: randBetween(1.4, 2.0) });
      finalState = 'PENDING';
      finalStateChangedMin = startMin;
    } else if (def.desiredState === 'FIRING') {
      const startMin = -randInt(conf + 10, conf + 60);
      const endMin = randInt(10, 60);
      windows.push({ startMin, endMin, intensity: randBetween(1.5, 2.5) });
      finalState = 'FIRING';
      finalStateChangedMin = startMin + conf;
    } else if (def.desiredState === 'RECOVERING') {
      const endMin = -randInt(1, Math.max(1, Math.floor(conf / 2)));
      const startMin = endMin - randInt(30, 120);
      windows.push({ startMin, endMin, intensity: randBetween(1.4, 2.2) });
      finalState = 'RECOVERING';
      finalStateChangedMin = endMin;
    }

    const lastFiringStart = [...windows].reverse().find(w => w.startMin + conf <= 0);
    const lastTriggeredMin = lastFiringStart ? lastFiringStart.startMin + conf : null;

    return { windows, finalState, finalStateChangedMin, lastTriggeredMin };
  }

  function minOffsetToMs(offset: number): number {
    return nowMs + offset * MINUTE_MS;
  }

  function buildOp(
    timestamp: number,
    opts: { ok: boolean; durationMs: number },
  ): CollectedOperation {
    const op = randomOperation();
    const client = pickWeightedClient();
    return {
      timestamp,
      operation: op.operation,
      operationName: op.operationName,
      fields: op.fields,
      execution: {
        ok: opts.ok,
        duration: Math.round(opts.durationMs * 1_000_000),
        errorsTotal: opts.ok ? 0 : 1,
      },
      metadata: {
        client: {
          name: client.name,
          ...(client.version ? { version: client.version } : {}),
        },
      },
    };
  }

  function computePerMinuteCount(def: AlertRuleShape, intensity: number): number {
    if (def.type === MetricAlertRuleType.Traffic) {
      if (def.direction === MetricAlertRuleDirection.Below) return 0;
      if (def.thresholdType === MetricAlertRuleThresholdType.FixedValue) {
        return Math.max(1, Math.ceil((def.thresholdValue * intensity) / def.timeWindowMinutes));
      }
      return Math.max(
        2,
        Math.ceil((BASELINE_OPS_PER_HOUR / 60) * (1 + (def.thresholdValue * intensity) / 100)),
      );
    }
    if (def.type === MetricAlertRuleType.ErrorRate) return 30;
    return 40;
  }

  function emitMinuteOps(
    out: CollectedOperation[],
    def: AlertRuleShape,
    intensity: number,
    count: number,
    minuteStartMs: number,
  ) {
    if (
      def.type === MetricAlertRuleType.Traffic &&
      def.direction === MetricAlertRuleDirection.Below
    ) {
      return;
    }
    const baseDuration = 200;

    if (def.type === MetricAlertRuleType.Traffic) {
      for (let i = 0; i < count; i++) {
        out.push(
          buildOp(Math.floor(minuteStartMs + Math.random() * MINUTE_MS), {
            ok: Math.random() > 0.02,
            durationMs: baseDuration + randBetween(-80, 80),
          }),
        );
      }
      return;
    }

    if (def.type === MetricAlertRuleType.ErrorRate) {
      const targetErrorRate =
        def.thresholdType === MetricAlertRuleThresholdType.FixedValue
          ? (def.thresholdValue * intensity) / 100
          : Math.min(0.9, 0.02 * (1 + (def.thresholdValue * intensity) / 100));
      const clamped = Math.min(0.95, Math.max(0.05, targetErrorRate));
      for (let i = 0; i < count; i++) {
        out.push(
          buildOp(Math.floor(minuteStartMs + Math.random() * MINUTE_MS), {
            ok: Math.random() > clamped,
            durationMs: baseDuration + randBetween(-80, 80),
          }),
        );
      }
      return;
    }

    // LATENCY
    const pNByMetric: Record<string, number> = {
      [MetricAlertRuleMetric.Avg]: 50,
      [MetricAlertRuleMetric.P75]: 75,
      [MetricAlertRuleMetric.P90]: 90,
      [MetricAlertRuleMetric.P95]: 95,
      [MetricAlertRuleMetric.P99]: 99,
    };
    const targetP = def.metric ? (pNByMetric[def.metric] ?? 90) : 90;
    const slowFraction = Math.min(0.95, (100 - targetP) / 100 + 0.05);
    const highDurationMs =
      def.thresholdType === MetricAlertRuleThresholdType.FixedValue
        ? def.thresholdValue * intensity
        : baseDuration * (1 + (def.thresholdValue * intensity) / 100);

    for (let i = 0; i < count; i++) {
      const isSlow = Math.random() < slowFraction;
      const durationMs = isSlow
        ? highDurationMs * randBetween(1.0, 1.3)
        : baseDuration + randBetween(-80, 120);
      out.push(
        buildOp(Math.floor(minuteStartMs + Math.random() * MINUTE_MS), {
          ok: Math.random() > 0.02,
          durationMs,
        }),
      );
    }
  }

  function signalToOps(def: AlertRuleShape, plan: SignalPlan): CollectedOperation[] {
    const ops: CollectedOperation[] = [];
    const W = def.timeWindowMinutes;
    for (const window of plan.windows) {
      const perMinCount = computePerMinuteCount(def, window.intensity);
      const firstMin =
        def.direction === MetricAlertRuleDirection.Below
          ? window.startMin
          : window.startMin - (W - 1);
      const lastMin = window.endMin;
      for (let m = firstMin; m < lastMin; m++) {
        emitMinuteOps(ops, def, window.intensity, perMinCount, minOffsetToMs(m));
      }
    }
    return ops;
  }

  type TransitionInsert = {
    ruleId: string;
    fromState: DesiredState;
    toState: DesiredState;
    value: number;
    previousValue: number;
    thresholdValue: number;
    createdAt: Date;
  };

  type IncidentInsert = {
    ruleId: string;
    startedAt: Date;
    resolvedAt: Date | null;
    currentValue: number;
    previousValue: number;
    thresholdValue: number;
  };

  function metricBaseline(def: AlertRuleShape): number {
    if (def.type === MetricAlertRuleType.Traffic)
      return (BASELINE_OPS_PER_HOUR / 60) * def.timeWindowMinutes;
    if (def.type === MetricAlertRuleType.ErrorRate) return 2;
    return 200;
  }

  function round(n: number): number {
    if (n < 1) return parseFloat(n.toFixed(3));
    if (n < 10) return parseFloat(n.toFixed(2));
    if (n < 100) return parseFloat(n.toFixed(1));
    return Math.round(n);
  }

  function sampleBreachValue(def: AlertRuleShape, intensity: number): number {
    if (def.thresholdType === MetricAlertRuleThresholdType.FixedValue) {
      if (def.direction === MetricAlertRuleDirection.Below) {
        return round(def.thresholdValue * randBetween(0.2, 0.7));
      }
      return round(def.thresholdValue * intensity);
    }
    const baseline = metricBaseline(def);
    const deltaPct = def.thresholdValue * intensity;
    const value =
      def.direction === MetricAlertRuleDirection.Below
        ? baseline * (1 - deltaPct / 100)
        : baseline * (1 + deltaPct / 100);
    return round(Math.max(0, value));
  }

  function samplePreviousValue(def: AlertRuleShape): number {
    if (def.thresholdType === MetricAlertRuleThresholdType.FixedValue) {
      return round(def.thresholdValue * randBetween(0.4, 0.8));
    }
    return round(metricBaseline(def));
  }

  function sampleSafeValue(def: AlertRuleShape): number {
    if (def.thresholdType === MetricAlertRuleThresholdType.FixedValue) {
      if (def.direction === MetricAlertRuleDirection.Below) {
        return round(def.thresholdValue * randBetween(1.2, 2.0));
      }
      return round(def.thresholdValue * randBetween(0.2, 0.6));
    }
    return round(metricBaseline(def));
  }

  function signalToStateLog(
    ruleId: string,
    def: AlertRuleShape,
    plan: SignalPlan,
  ): { transitions: TransitionInsert[]; incidents: IncidentInsert[] } {
    const transitions: TransitionInsert[] = [];
    const incidents: IncidentInsert[] = [];
    const conf = Math.max(def.confirmationMinutes ?? 0, 1);

    for (const window of plan.windows) {
      const breachValue = sampleBreachValue(def, window.intensity);
      const previousValue = samplePreviousValue(def);
      const safeValue = sampleSafeValue(def);
      const pendingAtMin = window.startMin;
      const firingAtMin = window.startMin + conf;
      const recoveringAtMin = window.endMin;
      const normalAtMin = window.endMin + conf;

      if (pendingAtMin <= 0) {
        transitions.push({
          ruleId,
          fromState: 'NORMAL',
          toState: 'PENDING',
          value: breachValue,
          previousValue,
          thresholdValue: def.thresholdValue,
          createdAt: new Date(minOffsetToMs(pendingAtMin)),
        });
      }
      if (firingAtMin <= 0) {
        transitions.push({
          ruleId,
          fromState: 'PENDING',
          toState: 'FIRING',
          value: breachValue,
          previousValue,
          thresholdValue: def.thresholdValue,
          createdAt: new Date(minOffsetToMs(firingAtMin)),
        });
      }
      if (recoveringAtMin <= 0) {
        transitions.push({
          ruleId,
          fromState: 'FIRING',
          toState: 'RECOVERING',
          value: safeValue,
          previousValue: breachValue,
          thresholdValue: def.thresholdValue,
          createdAt: new Date(minOffsetToMs(recoveringAtMin)),
        });
      }
      if (normalAtMin <= 0) {
        transitions.push({
          ruleId,
          fromState: 'RECOVERING',
          toState: 'NORMAL',
          value: safeValue,
          previousValue: safeValue,
          thresholdValue: def.thresholdValue,
          createdAt: new Date(minOffsetToMs(normalAtMin)),
        });
      }
      if (firingAtMin <= 0) {
        incidents.push({
          ruleId,
          startedAt: new Date(minOffsetToMs(firingAtMin)),
          resolvedAt: recoveringAtMin <= 0 ? new Date(minOffsetToMs(recoveringAtMin)) : null,
          currentValue: breachValue,
          previousValue,
          thresholdValue: def.thresholdValue,
        });
      }
    }
    return { transitions, incidents };
  }

  // Rule shapes — channel IDs resolved later after alert channels are created.
  // Thresholds sized relative to ~60 ops/hr, ~2% error, ~200ms median latency baseline.
  const ruleShapes: AlertRuleShape[] = [
    {
      // "Latency degrades during peak business hours"
      name: 'P95 Latency Above 800ms - Last 30 Min',
      type: MetricAlertRuleType.Latency,
      metric: MetricAlertRuleMetric.P95,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 800,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelKeys: ['slack'],
      desiredState: 'NORMAL',
      scenario: 'business_hours',
    },
    {
      // "Weekend traffic dips — service drops low every Sat/Sun night"
      name: 'Request Rate Below 10 - Last 30 Min',
      type: MetricAlertRuleType.Traffic,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 10,
      direction: MetricAlertRuleDirection.Below,
      severity: MetricAlertRuleSeverity.Critical,
      channelKeys: ['slack', 'webhook'],
      desiredState: 'NORMAL',
      scenario: 'weekend_dip',
    },
    {
      // "Marketing pushes / viral spikes — short bursts, breaching now"
      name: 'Traffic Increased by 200% - Last 15 Min',
      type: MetricAlertRuleType.Traffic,
      timeWindowMinutes: 15,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 200,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelKeys: ['webhook'],
      desiredState: 'PENDING',
      scenario: 'spiky',
    },
    {
      // "Error spikes shortly after deploys (Tue/Thu 14:00 UTC pattern)"
      name: 'Error Rate Above 20% - Last 5 Min',
      type: MetricAlertRuleType.ErrorRate,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 20,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Critical,
      channelKeys: ['slack', 'webhook'],
      desiredState: 'PENDING',
      scenario: 'post_deploy',
    },
    {
      // "Flapping API — repeated short bursts, currently active"
      name: 'Error Rate Above 10% - Last 5 Min',
      type: MetricAlertRuleType.ErrorRate,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 10,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelKeys: ['slack'],
      desiredState: 'FIRING',
      scenario: 'frequent_short',
    },
    {
      // "DB tail latency getting worse over weeks — currently breaching hard"
      name: 'P99 Latency Above 2000ms - Last 30 Min',
      type: MetricAlertRuleType.Latency,
      metric: MetricAlertRuleMetric.P99,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 2000,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelKeys: ['slack', 'webhook'],
      desiredState: 'FIRING',
      scenario: 'degrading_trend',
    },
    {
      // "Failed deploy → error spike → rollback. Just recovered."
      name: 'Error Rate Increased by 200% - Last 30 Min',
      type: MetricAlertRuleType.ErrorRate,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 200,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Critical,
      channelKeys: ['slack', 'webhook'],
      desiredState: 'RECOVERING',
      scenario: 'sustained',
    },
  ];

  // Apply SEED_RULE_LIMIT to scope down the seed for fast iteration.
  if (SEED_RULE_LIMIT !== null && SEED_RULE_LIMIT < ruleShapes.length) {
    ruleShapes.length = SEED_RULE_LIMIT;
    console.log(`🪒 SEED_RULE_LIMIT=${SEED_RULE_LIMIT} — scoped to first ${SEED_RULE_LIMIT} rules`);
  }

  console.log(`🗺️  Pre-planning signals for ${ruleShapes.length} rules...`);
  const plansByRule = new Map<string, SignalPlan>();
  for (const shape of ruleShapes) {
    plansByRule.set(shape.name, buildRuleSignals(shape));
  }

  // Collect TRAFFIC-Below suppression windows as [startMs, endMs) ranges.
  const suppressionWindows: Array<{ start: number; end: number }> = [];
  for (const shape of ruleShapes) {
    if (
      shape.type === MetricAlertRuleType.Traffic &&
      shape.direction === MetricAlertRuleDirection.Below
    ) {
      const plan = plansByRule.get(shape.name)!;
      for (const w of plan.windows) {
        suppressionWindows.push({
          start: minOffsetToMs(w.startMin),
          end: minOffsetToMs(w.endMin),
        });
      }
    }
  }
  const isSuppressed = (ts: number): boolean => {
    for (const w of suppressionWindows) {
      if (ts >= w.start && ts < w.end) return true;
    }
    return false;
  };

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

  // Baseline traffic: ~60 ops/hour with ~2% error rate and ~200ms median latency.
  // Higher than before so BELOW rules are visible and signal injections don't drown
  // out the baseline completely at coarser view resolutions.
  let suppressedCount = 0;
  for (let t = now - THIRTY_DAYS_MS; t <= now; t += ONE_HOUR_MS) {
    const opsThisHour = 55 + Math.floor(Math.random() * 15); // 55–70 per hour
    for (let i = 0; i < opsThisHour; i++) {
      const timestamp = t + Math.floor(Math.random() * ONE_HOUR_MS);
      // Skip baseline ops inside TRAFFIC-Below suppression windows so those rules see
      // an actual drop in the rolling window sum.
      if (isSuppressed(timestamp)) {
        suppressedCount++;
        continue;
      }
      const op = randomOperation();
      const client = pickWeightedClient();
      const ok = Math.random() > 0.02;
      allOperations.push({
        timestamp,
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
  if (suppressedCount > 0) {
    console.log(
      `   🔇 Skipped ${suppressedCount} baseline ops for TRAFFIC-Below suppression windows`,
    );
  }

  console.log(`   Generated ${allOperations.length} baseline operations across 30 days.`);

  // Send baseline ops in batches so downstream saved-filter creation + ingestion wait
  // work. Alert signal ops are flushed separately later.
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

  // Helper for saved filter operations
  const targetSelector = {
    organizationSlug: organization.slug,
    projectSlug: project.slug,
    targetSlug: target.slug,
  };

  // Wait for ingestion — poll until operations appear in ClickHouse
  const { parse } = await import('graphql');
  const MAX_WAIT_MS = 120_000; // 2 minutes max
  const POLL_INTERVAL_MS = 5_000; // check every 5s
  const waitStart = Date.now();

  type OpsResult = {
    target?: {
      operationsStats?: {
        operations?: {
          edges: Array<{ node: { name: string; operationHash: string | null } }>;
        };
      };
    };
  };

  async function fetchOperationHashes(): Promise<Map<string, string>> {
    const result = await execute({
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

    const edges = (result as OpsResult).target?.operationsStats?.operations?.edges ?? [];
    const hashMap = new Map<string, string>();
    for (const edge of edges) {
      if (edge.node.operationHash && edge.node.name) {
        const underscoreIdx = edge.node.name.indexOf('_');
        const operationName =
          underscoreIdx >= 0 ? edge.node.name.slice(underscoreIdx + 1) : edge.node.name;
        hashMap.set(operationName, edge.node.operationHash);
      }
    }
    return hashMap;
  }

  console.log('⏳ Waiting for usage ingestion (polling up to 2 minutes)...');
  let operationHashMap = new Map<string, string>();

  while (Date.now() - waitStart < MAX_WAIT_MS) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    operationHashMap = await fetchOperationHashes();
    const elapsed = Math.round((Date.now() - waitStart) / 1000);
    if (operationHashMap.size > 0) {
      console.log(`   Found ${operationHashMap.size} operations after ${elapsed}s`);
      break;
    }
    process.stdout.write(`   ${elapsed}s — no operations yet, retrying...\n`);
  }

  if (operationHashMap.size === 0) {
    console.warn('⚠️  No operations found after 2 minutes. Saved filters will have 0 ops.');
  }

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
      clientFilters: [{ name: 'web-app' }, { name: 'ios' }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 372,
    },
    {
      name: 'Mobile Clients',
      description: 'iOS and Android traffic',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(10, 25),
      clientFilters: [
        { name: 'ios', versions: ['2.0.0', '2.5.0', '2.10.0', '2.20.0'] },
        { name: 'android', versions: ['3.0.0', '3.5.0', '3.9.0'] },
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
      clientFilters: [{ name: 'admin-dashboard-internal-tools' }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 64,
    },
    {
      name: 'BFF Layer',
      description: 'Mobile BFF service traffic',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.slice(50, 80),
      clientFilters: [{ name: 'mobile-backend-for-frontend-service' }],
      dateRange: { from: 'now-30d', to: 'now' },
      views: 118,
    },
    {
      name: 'Error Investigation',
      description: 'Operations with known error patterns',
      visibility: SavedFilterVisibilityType.Private,
      operationNames: allOpNames.slice(80, 90),
      clientFilters: [{ name: 'android', versions: ['3.0.0'] }],
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
      clientFilters: [{ name: 'ios', versions: ['2.20.0', '2.24.0'] }],
      dateRange: { from: 'now-7d', to: 'now' },
      views: 31,
    },
    {
      name: 'Analytics Worker',
      description: 'Background analytics service operations',
      visibility: SavedFilterVisibilityType.Shared,
      operationNames: allOpNames.filter(n => n.startsWith('Analytics')),
      clientFilters: [{ name: 'analytics-pipeline-worker-v2' }],
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
        { name: 'ios', versions: ['2.24.0'] },
        { name: 'android', versions: ['3.9.0'] },
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

  // Track views to populate view counts. Each view is a single GraphQL ping,
  // so fan out per-filter and cap concurrency to stay polite to the server.
  console.log(`👁️  Tracking views for ${createdFilters.length} filters...`);
  const viewStart = Date.now();
  let totalViews = 0;
  const VIEW_CONCURRENCY = 25;
  for (const filter of createdFilters) {
    for (let i = 0; i < filter.views; i += VIEW_CONCURRENCY) {
      const chunk = Math.min(VIEW_CONCURRENCY, filter.views - i);
      await Promise.all(Array.from({ length: chunk }, () => trackSavedFilterView(filter.id)));
    }
    totalViews += filter.views;
    console.log(`   "${filter.name}": ${filter.views} views`);
  }
  console.log(
    `   ✓ ${totalViews} views across ${createdFilters.length} filters in ${(
      (Date.now() - viewStart) /
      1000
    ).toFixed(1)}s`,
  );

  // -------------------------------------------------------------------------
  // 6. Metric Alert Rules
  // -------------------------------------------------------------------------

  console.log('\n🚨 Creating metric alert rules...');

  // Use Webhook channels for seeding — Slack channels require a Slack token on the org
  // which isn't available in local dev.
  const channel1 = await addAlertChannel(
    {
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      name: 'Slack #alerts (webhook)',
      type: AlertChannelType.Webhook,
      webhook: { endpoint: 'http://localhost:9999/slack-alerts' },
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  const channel2 = await addAlertChannel(
    {
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      name: 'PagerDuty Webhook',
      type: AlertChannelType.Webhook,
      webhook: { endpoint: 'http://localhost:9999/pagerduty' },
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());

  const slackChannelId = channel1.addAlertChannel.ok!.addedAlertChannel.id;
  const webhookChannelId = channel2.addAlertChannel.ok!.addedAlertChannel.id;
  console.log(`   Channels: #alerts (${slackChannelId}), PagerDuty (${webhookChannelId})`);

  type AlertRuleDef = AlertRuleShape & { channelIds: string[] };

  const channelKeyToId: Record<'slack' | 'webhook', string> = {
    slack: slackChannelId,
    webhook: webhookChannelId,
  };

  const alertRuleDefs: AlertRuleDef[] = ruleShapes.map(s => ({
    ...s,
    channelIds: s.channelKeys.map(k => channelKeyToId[k]),
  }));

  const createdAlertRules: Array<{ id: string; def: AlertRuleDef }> = [];

  for (const def of alertRuleDefs) {
    const result = await addMetricAlertRule(
      {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
        name: def.name,
        type: def.type,
        metric: def.metric,
        timeWindowMinutes: def.timeWindowMinutes,
        thresholdType: def.thresholdType,
        thresholdValue: def.thresholdValue,
        direction: def.direction,
        severity: def.severity,
        channelIds: def.channelIds,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());

    const rule = result.addMetricAlertRule.ok?.addedMetricAlertRule;
    if (rule) {
      createdAlertRules.push({ id: rule.id, def });
      console.log(`   ✓ ${def.name}`);
    } else {
      console.error(`   ✗ Failed: ${def.name}`);
    }
  }

  // ─── Metric-first alert history ───────────────────────────────────────────
  //
  // For each rule: (1) plan incident windows tailored to desiredState, (2) generate
  // per-minute ClickHouse ops so the rule actually breaches during those windows,
  // (3) derive state-log / incident / rule-row rows from those same windows.
  console.log('\n📊 Generating metric-first alert signals...');

  const alertPool = await createPostgresDatabasePool({
    connectionParameters: getSeedPGConnectionString(),
  });

  // ──── Generate ops + transitions + incidents for all rules ────

  const signalOps: CollectedOperation[] = [];
  const allTransitions: TransitionInsert[] = [];
  const allIncidents: IncidentInsert[] = [];
  const ruleStateWrites: Array<{
    id: string;
    state: DesiredState;
    stateChangedAt: Date;
    lastTriggeredAt: Date | null;
  }> = [];

  for (const rule of createdAlertRules) {
    const def = rule.def;
    // Reuse the plan that was computed up-front before baseline generation so state-log
    // timestamps align with the suppression-aware baseline + signal ops.
    const plan = plansByRule.get(def.name)!;
    const ops = signalToOps(def, plan);
    const { transitions, incidents } = signalToStateLog(rule.id, def, plan);

    signalOps.push(...ops);
    allTransitions.push(...transitions);
    allIncidents.push(...incidents);

    ruleStateWrites.push({
      id: rule.id,
      state: plan.finalState,
      stateChangedAt: new Date(minOffsetToMs(plan.finalStateChangedMin)),
      lastTriggeredAt:
        plan.lastTriggeredMin != null ? new Date(minOffsetToMs(plan.lastTriggeredMin)) : null,
    });

    console.log(
      `   📈 ${def.name}: ${plan.windows.length} incidents, ${ops.length} ops, final=${plan.finalState}`,
    );
  }

  // Flush signal ops. Baseline has already been flushed to ClickHouse earlier.
  // Note: TRAFFIC-Below suppression isn't applied post-hoc since baseline is already
  // committed; the only seeded Below rule is currently in NORMAL state so its past
  // incidents are cosmetic (state log + incidents) with no required visible drop.
  if (signalOps.length > 0) {
    console.log(`\n🔥 Flushing ${signalOps.length} signal operations...`);
    const totalSignalBatches = Math.ceil(signalOps.length / BATCH_SIZE);
    for (let i = 0; i < signalOps.length; i += BATCH_SIZE) {
      const batch = signalOps.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      process.stdout.write(`   Signal batch ${batchNum}/${totalSignalBatches}...`);
      const result = await legacyCollect({
        operations: batch,
        token: secret,
        authorizationHeader: 'authorization',
      });
      if (result.status !== 200) {
        console.error(` FAILED (status ${result.status}):`, result.body);
      } else {
        const body = result.body as { operations: { accepted: number; rejected: number } };
        console.log(
          ` ✓ ${body.operations.accepted} accepted, ${body.operations.rejected} rejected`,
        );
      }
    }
  }

  const alertExpiresAt = new Date(nowMs + (ALERT_DAYS_AHEAD + 1) * 24 * 60 * 60 * 1000);

  // ---------------------------------------------------------------------------
  // Bulk-insert state log + incidents + rule-state updates.
  // Earlier this was three loops issuing one query per row; ~hundreds of round
  // trips per seed. Now batched into a handful of multi-row statements.
  // ---------------------------------------------------------------------------
  if (allTransitions.length > 0) {
    const start = Date.now();
    process.stdout.write(`💾 Writing ${allTransitions.length} state-log rows...`);
    try {
      const rowFragments = allTransitions.map(
        t => psql.fragment`(
          ${t.ruleId}, ${target.id}, ${t.fromState}, ${t.toState},
          ${t.value}, ${t.previousValue}, ${t.thresholdValue},
          ${t.createdAt.toISOString()}, ${alertExpiresAt.toISOString()}
        )`,
      );
      await alertPool.query(psql`
        INSERT INTO "metric_alert_state_log" (
          "metric_alert_rule_id", "target_id", "from_state", "to_state",
          "value", "previous_value", "threshold_value", "created_at", "expires_at"
        ) VALUES ${psql.join(rowFragments, psql.fragment`, `)}
      `);
      console.log(` ✓ ${((Date.now() - start) / 1000).toFixed(2)}s`);
    } catch (err) {
      console.error(
        `\n   FAILED — first row ruleId=${allTransitions[0].ruleId}, last row ruleId=${
          allTransitions[allTransitions.length - 1].ruleId
        }`,
      );
      throw err;
    }
  }

  if (allIncidents.length > 0) {
    const start = Date.now();
    process.stdout.write(`💾 Writing ${allIncidents.length} incidents...`);
    try {
      const rowFragments = allIncidents.map(
        inc => psql.fragment`(
          ${inc.ruleId}, ${inc.startedAt.toISOString()},
          ${inc.resolvedAt ? inc.resolvedAt.toISOString() : null},
          ${inc.currentValue}, ${inc.previousValue}, ${inc.thresholdValue}
        )`,
      );
      await alertPool.query(psql`
        INSERT INTO "metric_alert_incidents" (
          "metric_alert_rule_id", "started_at", "resolved_at",
          "current_value", "previous_value", "threshold_value"
        ) VALUES ${psql.join(rowFragments, psql.fragment`, `)}
      `);
      console.log(` ✓ ${((Date.now() - start) / 1000).toFixed(2)}s`);
    } catch (err) {
      console.error(
        `\n   FAILED — first row ruleId=${allIncidents[0].ruleId}, last row ruleId=${
          allIncidents[allIncidents.length - 1].ruleId
        }`,
      );
      throw err;
    }
  }

  if (ruleStateWrites.length > 0) {
    const start = Date.now();
    process.stdout.write(`🔄 Updating ${ruleStateWrites.length} rule states...`);
    try {
      const ruleRows = ruleStateWrites.map(r => [
        r.id,
        r.state,
        r.stateChangedAt.toISOString(),
        r.lastTriggeredAt ? r.lastTriggeredAt.toISOString() : null,
      ]);
      await alertPool.query(psql`
        UPDATE "metric_alert_rules" AS r
        SET
          "state" = u.state::"metric_alert_state",
          "state_changed_at" = u.state_changed_at,
          "last_evaluated_at" = NOW(),
          "last_triggered_at" = u.last_triggered_at,
          "updated_at" = NOW()
        FROM ${psql.unnest(ruleRows, ['uuid', 'text', 'timestamptz', 'timestamptz'])}
          AS u(id, state, state_changed_at, last_triggered_at)
        WHERE r.id = u.id
      `);
      console.log(` ✓ ${((Date.now() - start) / 1000).toFixed(2)}s`);
    } catch (err) {
      console.error(
        `\n   FAILED — first ruleId=${ruleStateWrites[0].id}, last ruleId=${
          ruleStateWrites[ruleStateWrites.length - 1].id
        }`,
      );
      throw err;
    }
  }

  await alertPool.end();

  console.log(`
✅ Seed complete!

Credentials:
  Email:    ${ownerEmail}
  Password: ${auth.isExistingUser ? '(use existing password)' : password}

Navigate to:
  http://localhost:3000/${organization.slug}/${project.slug}/${target.slug}/insights
  http://localhost:3000/${organization.slug}/${project.slug}/${target.slug}/alerts

Rules in non-NORMAL states (for polling testing):
${createdAlertRules
  .filter(r => r.def.desiredState !== 'NORMAL')
  .map(r => `  ${r.def.desiredState.padEnd(12)} ${r.def.name}`)
  .join('\n')}
`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
