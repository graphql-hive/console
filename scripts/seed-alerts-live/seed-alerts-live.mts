#!/usr/bin/env -S tsx
// See ./README.md for what this script does and how to run it.
// `reflect-metadata` polyfill must load before any testkit import — the
// testkit transitively pulls in graphql-modules, which uses TS decorators
// (@Injectable etc.) that require this runtime. Matches the existing seed
// and every integration test's first import.
import 'reflect-metadata';
import * as http from 'node:http';
import * as net from 'node:net';

// Tell the testkit to talk to services running locally (`pnpm dev:hive`)
// instead of trying to find them via Docker. Mirrors the existing seed.
// Must be set BEFORE the testkit imports below run.
process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
await import('../../integration-tests/local-dev.ts');

const { createPostgresDatabasePool, psql } = await import('@hive/postgres');
const { DEV_USER_PASSWORD, getOrCreateAuth, getSeedPGConnectionString } = await import(
  '../utils/get-or-create-auth'
);
const { promptForEmail } = await import('../utils/prompt-for-email');
const {
  addAlertChannel,
  addMetricAlertRule,
  createOrganization,
  createProject,
  createToken,
  publishSchema,
} = await import('../../integration-tests/testkit/flow');
const { collect } = await import('../../integration-tests/testkit/usage');
const { getServiceHost } = await import('../../integration-tests/testkit/utils');
type KnownServices = Parameters<typeof getServiceHost>[0];
const {
  AlertChannelType,
  MetricAlertRuleDirection,
  MetricAlertRuleMetric,
  MetricAlertRuleSeverity,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
  ProjectType,
  TargetAccessScope,
} = await import('../../integration-tests/testkit/gql/graphql');

type Report = Parameters<typeof collect>[0]['report'];

const ORG_PREFIX = 'live-alerts-demo';
const WEBHOOK_PORT = 9999;
const TICK_INTERVAL_MS = 5_000;
const PHASE_DURATION_MS = 3 * 60 * 1000;
const DASHBOARD_URL = 'http://localhost:3000';

async function isPortFree(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const tester = net
      .createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

async function canReachService(name: KnownServices, port: number): Promise<boolean> {
  try {
    const host = await getServiceHost(name, port);
    const response = await fetch(`http://${host}`, { method: 'GET' });
    // Any HTTP response means we reached *something* listening; the body or
    // status doesn't matter — we just want to confirm TCP is open and the
    // service is serving.
    return response.status > 0;
  } catch {
    return false;
  }
}

async function preflight() {
  console.log('🔍 Preflight checks…');

  if (!(await isPortFree(WEBHOOK_PORT))) {
    console.error(
      `   ✗ Port ${WEBHOOK_PORT} is in use. Another seed-alerts-live process is probably running; stop it first.`,
    );
    process.exit(1);
  }
  console.log(`   ✓ Port ${WEBHOOK_PORT} free`);

  if (!(await canReachService('server', 8082))) {
    console.error(
      '   ✗ API server unreachable at port 8082. Is `pnpm dev:hive` running?',
    );
    process.exit(1);
  }
  console.log('   ✓ API server reachable');

  if (!(await canReachService('usage', 8081))) {
    console.error(
      '   ✗ Usage service unreachable at port 8081. Is `pnpm dev:hive` running?',
    );
    process.exit(1);
  }
  console.log('   ✓ Usage service reachable');
}

// Mirrors the intercept-server pattern at scripts/seed-traces/intercept-server.mts.
function startWebhookReceiver(): http.Server {
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const stamp = new Date().toISOString();
      console.log(`\n📨 [${stamp}] webhook ${req.method} ${req.url}`);
      try {
        console.log(JSON.stringify(JSON.parse(body), null, 2));
      } catch {
        console.log(body);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
    });
  });
  server.listen(WEBHOOK_PORT, '127.0.0.1');
  console.log(`\n📡 Webhook receiver listening on http://localhost:${WEBHOOK_PORT}`);
  return server;
}

type Ctx = {
  ownerEmail: string;
  ownerToken: string;
  isExistingUser: boolean;
  orgSlug: string;
  projectSlug: string;
  targetSlug: string;
  targetId: string;
  writeSecret: string;
  ruleIds: {
    traffic: string;
    errorRate: string;
    latency: string;
    trafficBelow: string;
    errorRateFixed: string;
    avgLatency: string;
    trafficHigh: string;
  };
};

async function setup(ownerEmail: string): Promise<Ctx> {
  const timestamp = Date.now();
  console.log(`\n🚀 Provisioning demo org for ${ownerEmail}…`);

  // `getOrCreateAuth` works for both "existing user" (creates a session
  // without re-signup so the dev can use their already-authenticated browser
  // tab) and "new email" (registers a fresh user). Returned via the shared
  // utility at scripts/utils/auth-via-existing-user.ts.
  const auth = await getOrCreateAuth(ownerEmail);
  const ownerToken = auth.access_token;

  const orgSlug = `${ORG_PREFIX}-${timestamp}`;
  const orgResult = await createOrganization({ slug: orgSlug }, ownerToken).then(r =>
    r.expectNoGraphQLErrors(),
  );
  const organization = orgResult.createOrganization.ok!.createdOrganizationPayload.organization;
  console.log(`   ✓ Organization: ${organization.slug}`);

  // Enable the per-org feature flag so the alerts feature is visible even
  // when the cluster-wide FEATURE_FLAGS_METRIC_ALERT_RULES_ENABLED env var
  // is off (which it is by default in local dev).
  const flagPool = await createPostgresDatabasePool({
    connectionParameters: getSeedPGConnectionString(),
  });
  try {
    await flagPool.query(psql`
      UPDATE "organizations"
      SET "feature_flags" = ${psql.jsonb({ metricAlertRules: true })}
      WHERE "id" = ${organization.id}
    `);
  } finally {
    await flagPool.end();
  }
  console.log('   ✓ Feature flag metricAlertRules=true');

  const projectResult = await createProject(
    {
      organization: { bySelector: { organizationSlug: organization.slug } },
      type: ProjectType.Single,
      slug: 'demo',
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  const project = projectResult.createProject.ok!.createdProject;
  const target = projectResult.createProject.ok!.createdTargets[0];
  console.log(`   ✓ Project: ${project.slug}, target: ${target.slug}`);

  // Need a target-scoped token to call the usage endpoint.
  const tokenResult = await createToken(
    {
      name: 'live-alerts-demo-write',
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      targetSlug: target.slug,
      organizationScopes: [],
      projectScopes: [],
      targetScopes: [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite],
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  const writeSecret = tokenResult.createToken.ok!.secret;

  // The usage service rejects operations against a target with no schema.
  // One tiny schema is enough for the demo's synthetic operations.
  await publishSchema(
    {
      author: 'live-alerts-demo',
      commit: `demo-${timestamp}`,
      sdl: `type Query { products: [String!]! orders: [String!]! status: String! ping: String }`,
    },
    writeSecret,
  ).then(r => r.expectNoGraphQLErrors());
  console.log('   ✓ Schema published');

  // One webhook channel pointing at our local receiver.
  const channelResult = await addAlertChannel(
    {
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      name: 'live-alerts-demo-webhook',
      type: AlertChannelType.Webhook,
      webhook: { endpoint: `http://localhost:${WEBHOOK_PORT}/alert` },
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  const channelId = channelResult.addAlertChannel.ok!.addedAlertChannel.id;
  console.log('   ✓ Webhook channel created');

  // Four short-window rules, deliberately varied along every other axis so
  // the demo covers the feature surface.
  const baseRuleInput = {
    organizationSlug: organization.slug,
    projectSlug: project.slug,
    targetSlug: target.slug,
    timeWindowMinutes: 1,
    channelIds: [channelId],
  };

  const ruleTraffic = (
    await addMetricAlertRule(
      {
        ...baseRuleInput,
        name: 'Traffic spike (> 50 req/min)',
        type: MetricAlertRuleType.Traffic,
        direction: MetricAlertRuleDirection.Above,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 50,
        severity: MetricAlertRuleSeverity.Info,
        confirmationMinutes: 0,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors())
  ).addMetricAlertRule.ok!.addedMetricAlertRule.id;

  const ruleErrorRate = (
    await addMetricAlertRule(
      {
        ...baseRuleInput,
        name: 'Error-rate change (+200% vs prior window)',
        type: MetricAlertRuleType.ErrorRate,
        direction: MetricAlertRuleDirection.Above,
        thresholdType: MetricAlertRuleThresholdType.PercentageChange,
        thresholdValue: 200,
        severity: MetricAlertRuleSeverity.Warning,
        confirmationMinutes: 0,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors())
  ).addMetricAlertRule.ok!.addedMetricAlertRule.id;

  const ruleLatency = (
    await addMetricAlertRule(
      {
        ...baseRuleInput,
        name: 'P95 latency > 1500ms (with 1-min confirmation)',
        type: MetricAlertRuleType.Latency,
        metric: MetricAlertRuleMetric.P95,
        direction: MetricAlertRuleDirection.Above,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 1500,
        severity: MetricAlertRuleSeverity.Critical,
        confirmationMinutes: 1,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors())
  ).addMetricAlertRule.ok!.addedMetricAlertRule.id;

  const ruleTrafficBelow = (
    await addMetricAlertRule(
      {
        ...baseRuleInput,
        name: 'Traffic drop (< 10 req/min)',
        type: MetricAlertRuleType.Traffic,
        direction: MetricAlertRuleDirection.Below,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 10,
        severity: MetricAlertRuleSeverity.Warning,
        confirmationMinutes: 0,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors())
  ).addMetricAlertRule.ok!.addedMetricAlertRule.id;

  // Three additional FIXED_VALUE rules so that BREACH phases produce more
  // simultaneous FIRINGs. These fire whenever metrics exceed their absolute
  // thresholds, unlike rule 2 which is a one-shot PERCENTAGE_CHANGE.
  const ruleErrorRateFixed = (
    await addMetricAlertRule(
      {
        ...baseRuleInput,
        name: 'High error rate (>= 25%)',
        type: MetricAlertRuleType.ErrorRate,
        direction: MetricAlertRuleDirection.Above,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 25,
        severity: MetricAlertRuleSeverity.Critical,
        confirmationMinutes: 0,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors())
  ).addMetricAlertRule.ok!.addedMetricAlertRule.id;

  const ruleAvgLatency = (
    await addMetricAlertRule(
      {
        ...baseRuleInput,
        name: 'Avg latency > 800ms',
        type: MetricAlertRuleType.Latency,
        metric: MetricAlertRuleMetric.Avg,
        direction: MetricAlertRuleDirection.Above,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 800,
        severity: MetricAlertRuleSeverity.Warning,
        confirmationMinutes: 0,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors())
  ).addMetricAlertRule.ok!.addedMetricAlertRule.id;

  const ruleTrafficHigh = (
    await addMetricAlertRule(
      {
        ...baseRuleInput,
        name: 'Traffic spike (> 100 req/min)',
        type: MetricAlertRuleType.Traffic,
        direction: MetricAlertRuleDirection.Above,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 100,
        severity: MetricAlertRuleSeverity.Warning,
        confirmationMinutes: 0,
      },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors())
  ).addMetricAlertRule.ok!.addedMetricAlertRule.id;
  console.log('   ✓ 7 rules created');

  // Pre-seed ~60s of backdated breach data so the very first cron tick after
  // rule creation already sees a fully-formed breach window in
  // operations_minutely. Without this, the first cron tick reads the mostly-
  // empty current minute and we lose 1-2 evaluator cycles waiting for data
  // to accumulate. Cuts time-to-first-FIRING from ~2-3 min to ~2 min and
  // removes the variance from where in the minute setup happens to finish.
  const preSeedNow = Date.now();
  const preSeedTickIntervalMs = 5_000;
  const preSeedDurationMs = 60_000;
  const preSeedBatches = preSeedDurationMs / preSeedTickIntervalMs;
  for (let i = 0; i < preSeedBatches; i++) {
    // Backdate from -60s up to -0s. ClickHouse buckets ops_minutely by the
    // operation's timestamp, so these land in the prior minute even though
    // we're writing them now.
    const timestampMs = preSeedNow - (preSeedBatches - i) * preSeedTickIntervalMs;
    const report = buildReport('BREACH', i, timestampMs);
    await collect({ report, accessToken: writeSecret });
  }
  console.log(`   ✓ Pre-seeded ${preSeedDurationMs / 1000}s of breach data`);

  return {
    ownerEmail,
    ownerToken,
    isExistingUser: auth.isExistingUser,
    orgSlug: organization.slug,
    projectSlug: project.slug,
    targetSlug: target.slug,
    targetId: target.id,
    writeSecret,
    ruleIds: {
      traffic: ruleTraffic,
      errorRate: ruleErrorRate,
      latency: ruleLatency,
      trafficBelow: ruleTrafficBelow,
      errorRateFixed: ruleErrorRateFixed,
      avgLatency: ruleAvgLatency,
      trafficHigh: ruleTrafficHigh,
    },
  };
}

function printSummary(ctx: Ctx) {
  const path = `/${ctx.orgSlug}/${ctx.projectSlug}/${ctx.targetSlug}/alerts/rules`;
  console.log('\n┌─ Demo ready ───────────────────────────────────────');
  console.log(`│ Email:      ${ctx.ownerEmail}`);
  console.log(`│ Password:   ${ctx.isExistingUser ? '(use existing password)' : DEV_USER_PASSWORD}`);
  console.log(`│ Open in UI: ${DASHBOARD_URL}${path}`);
  console.log('│');
  console.log('│ The alerts pages auto-poll every 15s. The cron evaluator');
  console.log('│ runs every minute. Expect the first NORMAL → PENDING →');
  console.log('│ FIRING transition within ~2 minutes (rules 1, 5, 6, 7),');
  console.log('│ a transient PENDING for rule 2 (PERCENTAGE_CHANGE), and');
  console.log('│ rule 3 (with confirmationMinutes=1) within ~2 minutes.');
  console.log('└────────────────────────────────────────────────────\n');
}

// Main loop alternates BREACH (high load + errors + latency) with NORMAL
// (low trickle, no errors, fast). Rule 4 (TRAFFIC BELOW 10) intentionally
// fires during NORMAL phase when traffic drops; the other three rules fire
// during BREACH. So every full cycle exercises every state on every rule.

// Two synthetic GraphQL operations, deduplicated into the Report.map so each
// Report.operations entry references a 'mapKey' rather than re-stating the
// operation body. Same shape real Hive clients send.
type OpMap = NonNullable<Report['map']>;
const OP_MAP: OpMap = {
  q1: {
    operationName: 'products',
    operation: 'query products { products }',
    fields: ['Query', 'Query.products'],
  },
  q2: {
    operationName: 'orders',
    operation: 'query orders { orders }',
    fields: ['Query', 'Query.orders'],
  },
};

type Phase = 'BREACH' | 'NORMAL';

function buildReport(phase: Phase, _tick: number, timestampMs = Date.now()): Report {
  const now = timestampMs;
  // BREACH: 20 ops per tick × 12 ticks/min = 240 req/min, well above rule 1's
  // 50 threshold and well above rule 4's 10 floor (so rule 4 recovers).
  // NORMAL: 1 op per tick = 12 req/min — comfortably below rule 1's 50
  // threshold and below rule 4's 10 floor (so rule 4 breaches).
  const opCount = phase === 'BREACH' ? 20 : 1;
  // BREACH durations: 2000ms (above rule 3's 1500ms P95 threshold).
  // NORMAL durations: 50ms (well below rule 3's threshold).
  const durationMs = phase === 'BREACH' ? 2_000 : 50;
  // BREACH error rate: 50%. NORMAL: 0%. The ERROR_RATE rule fires on
  // a percentage *change* from prior window — going from 0% to 50% is an
  // infinite increase, which the zero-window-synthesis fix in this PR
  // resolves to Infinity (always-fires for ABOVE direction).
  const errorRate = phase === 'BREACH' ? 0.5 : 0;

  const operations: NonNullable<Report['operations']> = [];
  for (let i = 0; i < opCount; i++) {
    const isError = errorRate > 0 && i % 2 === 0;
    operations.push({
      operationMapKey: i % 2 === 0 ? 'q1' : 'q2',
      timestamp: now,
      execution: {
        ok: !isError,
        // Duration is stored in ClickHouse as UInt64 nanoseconds. Mirror the
        // existing seed's conversion (durationMs × 1_000_000).
        duration: durationMs * 1_000_000,
        errorsTotal: isError ? 1 : 0,
      },
    });
  }

  return {
    size: operations.length,
    map: OP_MAP,
    operations,
  };
}

async function runMainLoop(ctx: Ctx, abortSignal: AbortSignal) {
  // `injecting` describes what the SCRIPT is doing on each tick — pushing
  // breach-shaped data, or pushing nothing (silence). It's intentionally a
  // separate concept from rule state (NORMAL/PENDING/FIRING/RECOVERING),
  // which the workflows evaluator owns and updates in response to the data
  // we inject here.
  type Injecting = 'BREACH' | 'NORMAL';
  let injecting: Injecting = 'BREACH';
  let phaseStartedAt = Date.now();
  let tickInPhase = 0;
  let totalTicks = 0;

  console.log('▶ Starting main loop. Press Ctrl+C to stop.');

  while (!abortSignal.aborted) {
    const elapsedInPhase = Date.now() - phaseStartedAt;
    if (elapsedInPhase >= PHASE_DURATION_MS) {
      injecting = injecting === 'BREACH' ? 'NORMAL' : 'BREACH';
      phaseStartedAt = Date.now();
      tickInPhase = 0;
    }

    // Emit a header + the expectation only on the first tick of each phase.
    // The expectation doesn't change tick-to-tick within a phase, so logging
    // it every 5s would just be noise.
    if (tickInPhase === 0) {
      const stamp = new Date().toLocaleTimeString('en-US', { hour12: false });
      const minutes = Math.round(PHASE_DURATION_MS / 60_000);
      const expected =
        injecting === 'BREACH'
          ? 'rules 1,5,6,7 → FIRING within ~2 ticks; rule 2 transient PENDING then NORMAL (PERCENTAGE_CHANGE settles to 0); rule 3 → PENDING then FIRING (confirm 1m); rule 4 → recovers'
          : 'rules 1,5,6,7 → RECOVERING then NORMAL; rule 4 → FIRING (zero traffic falls below its 10/min floor); rule 3 → RECOVERING then NORMAL';
      console.log(`\n[${stamp}] ═══ injecting=${injecting} for ~${minutes}min ${'═'.repeat(40)}`);
      console.log(`           expect: ${expected}`);
    }

    const stamp = new Date().toLocaleTimeString('en-US', { hour12: false });

    if (injecting === 'BREACH') {
      const report = buildReport('BREACH', totalTicks);
      try {
        const result = await collect({ report, accessToken: ctx.writeSecret });
        console.log(
          `[${stamp}]   tick ${tickInPhase} — pushed ${report.operations!.length} ops (50% errors, p95=2000ms)`,
        );
        if (result.status !== 200) {
          console.warn(
            `  ⚠ usage POST returned ${result.status}: ${JSON.stringify(result.body)}`,
          );
        }
      } catch (err) {
        console.warn('  ⚠ usage POST failed:', err);
      }
    } else {
      // injecting=NORMAL pushes ZERO traffic so rule 4 (TRAFFIC BELOW 10)
      // can actually fire. The evaluator's zero-window-synthesis path handles
      // the missing rows correctly: traffic resolves to 0, latency to 0,
      // error rate to 0 — which makes ABOVE-threshold rules recover and
      // BELOW-threshold rules breach.
      console.log(`[${stamp}]   tick ${tickInPhase} — no traffic injected (silence is the breach for rule 4)`);
    }

    tickInPhase++;
    totalTicks++;

    await new Promise(resolve => {
      const id = setTimeout(resolve, TICK_INTERVAL_MS);
      abortSignal.addEventListener('abort', () => {
        clearTimeout(id);
        resolve(undefined);
      });
    });
  }
}

async function main() {
  await preflight();

  // Accept an existing dev's email so they can keep using their already-
  // authenticated browser tab. Blank → auto-generate a fresh email.
  const inputEmail = await promptForEmail(
    'Owner email (Enter to auto-generate a fresh user): ',
  );
  const ownerEmail = inputEmail || `live-alerts-demo-${Date.now()}@localhost.localhost`;

  const webhookServer = startWebhookReceiver();
  const ctx = await setup(ownerEmail);
  printSummary(ctx);

  const abortController = new AbortController();
  let shuttingDown = false;
  process.on('SIGINT', () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n\n🛑 Shutting down…');
    abortController.abort();
    webhookServer.close(() => {
      console.log(`📌 Demo org left in place: ${ctx.orgSlug}`);
      console.log('   Run `pnpm seed:alerts-live:cleanup` to drop all live-alerts-demo-* orgs.');
      process.exit(0);
    });
  });

  await runMainLoop(ctx, abortController.signal);
}

main().catch(err => {
  console.error('\n💥 Fatal:', err);
  process.exit(1);
});
