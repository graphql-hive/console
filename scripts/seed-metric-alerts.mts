/**
 * Seeds metric alert rules with 30 days of historical data and 7 days of future data.
 *
 * Creates: alert channels, metric alert rules (all types), incidents, state log entries,
 * and sets some rules to non-NORMAL states for testing polling/live updates.
 *
 * Prerequisites:
 *   - Docker Compose is running (pnpm local:setup)
 *   - Services are running (pnpm dev:hive)
 *   - Run seed:insights first to have an org/project/target with usage data
 *
 * Usage:
 *   pnpm seed:metric-alerts
 */

import setCookie from 'set-cookie-parser';
import { createPostgresDatabasePool, psql } from '@hive/postgres';

process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
await import('../integration-tests/local-dev.ts');

const { ensureEnv } = await import('../integration-tests/testkit/env');
const { addAlertChannel, addMetricAlertRule } = await import('../integration-tests/testkit/flow');
const { getServiceHost } = await import('../integration-tests/testkit/utils');
const {
  AlertChannelType,
  MetricAlertRuleType,
  MetricAlertRuleMetric,
  MetricAlertRuleThresholdType,
  MetricAlertRuleDirection,
  MetricAlertRuleSeverity,
} = await import('../integration-tests/testkit/gql/graphql');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OWNER_EMAIL = 'alerts-seed@local.dev';
const PASSWORD = 'ilikebigturtlesandicannotlie47';
const DAYS_PAST = 30;
const DAYS_AHEAD = 7;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function signInOrSignUp(
  email: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const graphqlAddress = await getServiceHost('server', 8082);

  let response = await fetch(`http://${graphqlAddress}/auth-api/signup`, {
    method: 'POST',
    body: JSON.stringify({
      formFields: [
        { id: 'email', value: email },
        { id: 'password', value: PASSWORD },
      ],
    }),
    headers: { 'content-type': 'application/json' },
  });

  let body = await response.json();
  if (body.status === 'OK') {
    const cookies = setCookie.parse(response.headers.getSetCookie());
    return {
      access_token: cookies.find(c => c.name === 'sAccessToken')?.value ?? '',
      refresh_token: cookies.find(c => c.name === 'sRefreshToken')?.value ?? '',
    };
  }

  response = await fetch(`http://${graphqlAddress}/auth-api/signin`, {
    method: 'POST',
    body: JSON.stringify({
      formFields: [
        { id: 'email', value: email },
        { id: 'password', value: PASSWORD },
      ],
    }),
    headers: { 'content-type': 'application/json' },
  });

  body = await response.json();
  if (body.status === 'OK') {
    const cookies = setCookie.parse(response.headers.getSetCookie());
    return {
      access_token: cookies.find(c => c.name === 'sAccessToken')?.value ?? '',
      refresh_token: cookies.find(c => c.name === 'sRefreshToken')?.value ?? '',
    };
  }

  throw new Error('Failed to sign in or up: ' + JSON.stringify(body, null, 2));
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function getPGConnectionString() {
  const pg = {
    user: ensureEnv('POSTGRES_USER'),
    password: ensureEnv('POSTGRES_PASSWORD'),
    host: ensureEnv('POSTGRES_HOST'),
    port: ensureEnv('POSTGRES_PORT'),
    db: ensureEnv('POSTGRES_DB'),
  };
  return `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.db}?sslmode=disable`;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function hoursAhead(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('🚨 Seeding metric alert rules...\n');

  // 1. Find the first org/project/target that has usage data
  const pool = await createPostgresDatabasePool({
    connectionParameters: getPGConnectionString(),
  });

  const existingTarget = await pool.maybeOne(psql`
    SELECT
      t."id" as "targetId",
      t."clean_id" as "targetSlug",
      p."id" as "projectId",
      p."clean_id" as "projectSlug",
      o."id" as "organizationId",
      o."clean_id" as "organizationSlug"
    FROM "targets" t
    INNER JOIN "projects" p ON p."id" = t."project_id"
    INNER JOIN "organizations" o ON o."id" = p."org_id"
    ORDER BY t."created_at" DESC
    LIMIT 1
  `);

  if (!existingTarget) {
    console.error('❌ No targets found. Run seed:insights first.');
    process.exit(1);
  }

  const { targetId, targetSlug, projectId, projectSlug, organizationId, organizationSlug } =
    existingTarget as {
      targetId: string;
      targetSlug: string;
      projectId: string;
      projectSlug: string;
      organizationId: string;
      organizationSlug: string;
    };

  console.log(`📍 Using target: ${organizationSlug}/${projectSlug}/${targetSlug}`);

  // 2. Auth
  const auth = await signInOrSignUp(OWNER_EMAIL);
  const token = auth.access_token;
  console.log(`🔑 Authenticated as ${OWNER_EMAIL}`);

  // 3. Create alert channels
  console.log('\n📡 Creating alert channels...');

  const slackChannel = await addAlertChannel(
    {
      organizationSlug: organizationSlug as string,
      projectSlug: projectSlug as string,
      name: 'Slack #alerts',
      type: AlertChannelType.Slack,
      slack: { channel: '#alerts' },
    },
    token,
  ).then(r => r.expectNoGraphQLErrors());

  const webhookChannel = await addAlertChannel(
    {
      organizationSlug: organizationSlug as string,
      projectSlug: projectSlug as string,
      name: 'PagerDuty Webhook',
      type: AlertChannelType.Webhook,
      webhook: { endpoint: 'https://events.pagerduty.com/v2/enqueue' },
    },
    token,
  ).then(r => r.expectNoGraphQLErrors());

  const slackChannelId = slackChannel.addAlertChannel.ok!.addedAlertChannel.id;
  const webhookChannelId = webhookChannel.addAlertChannel.ok!.addedAlertChannel.id;
  console.log(`   Created: Slack #alerts (${slackChannelId})`);
  console.log(`   Created: PagerDuty Webhook (${webhookChannelId})`);

  // 4. Create metric alert rules
  console.log('\n📏 Creating metric alert rules...');

  const ruleDefs = [
    {
      name: 'Error Rate Above 10% - Last 5 Min',
      type: MetricAlertRuleType.ErrorRate,
      metric: null,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 10,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Critical,
      channelIds: [slackChannelId, webhookChannelId],
      // Will be set to FIRING
      desiredState: 'FIRING' as const,
    },
    {
      name: 'Error Rate Above 5%',
      type: MetricAlertRuleType.ErrorRate,
      metric: null,
      timeWindowMinutes: 60,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 5,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelIds: [slackChannelId, webhookChannelId],
      desiredState: 'FIRING' as const,
    },
    {
      name: 'Error Rate Increased by 75% - Last Hour',
      type: MetricAlertRuleType.ErrorRate,
      metric: null,
      timeWindowMinutes: 60,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 75,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Critical,
      channelIds: [slackChannelId],
      desiredState: 'NORMAL' as const,
    },
    {
      name: 'P99 Latency Above 2000ms',
      type: MetricAlertRuleType.Latency,
      metric: MetricAlertRuleMetric.P99,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 2000,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelIds: [slackChannelId, webhookChannelId],
      desiredState: 'FIRING' as const,
    },
    {
      name: 'P95 Latency Increased by 25%',
      type: MetricAlertRuleType.Latency,
      metric: MetricAlertRuleMetric.P95,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 25,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelIds: [webhookChannelId],
      desiredState: 'NORMAL' as const,
    },
    {
      name: 'P99 Latency Increased by 50%',
      type: MetricAlertRuleType.Latency,
      metric: MetricAlertRuleMetric.P99,
      timeWindowMinutes: 60,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 50,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Critical,
      channelIds: [slackChannelId],
      desiredState: 'NORMAL' as const,
    },
    {
      name: 'Request Rate Below 100 rpm',
      type: MetricAlertRuleType.Traffic,
      metric: null,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 100,
      direction: MetricAlertRuleDirection.Below,
      severity: MetricAlertRuleSeverity.Critical,
      channelIds: [slackChannelId, webhookChannelId],
      desiredState: 'NORMAL' as const,
    },
    {
      name: 'Traffic Decreased by 60% - Last Hour',
      type: MetricAlertRuleType.Traffic,
      metric: null,
      timeWindowMinutes: 60,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 60,
      direction: MetricAlertRuleDirection.Below,
      severity: MetricAlertRuleSeverity.Warning,
      channelIds: [webhookChannelId],
      desiredState: 'NORMAL' as const,
    },
    {
      name: 'Traffic Increased by 150% - Last 30 Min',
      type: MetricAlertRuleType.Traffic,
      metric: null,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 150,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelIds: [slackChannelId, webhookChannelId],
      desiredState: 'FIRING' as const,
    },
    {
      name: 'Traffic Increased by 200% - Last 15 Min',
      type: MetricAlertRuleType.Traffic,
      metric: null,
      timeWindowMinutes: 15,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 200,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelIds: [webhookChannelId],
      desiredState: 'PENDING' as const,
    },
    {
      name: 'Request Rate Above 10,000 rpm',
      type: MetricAlertRuleType.Traffic,
      metric: null,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 10000,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelIds: [slackChannelId],
      desiredState: 'RECOVERING' as const,
    },
  ];

  const createdRules: Array<{ id: string; name: string; desiredState: string }> = [];

  for (const def of ruleDefs) {
    const result = await addMetricAlertRule(
      {
        organizationSlug: organizationSlug as string,
        projectSlug: projectSlug as string,
        targetSlug: targetSlug as string,
        name: def.name,
        type: def.type,
        metric: def.metric ?? undefined,
        timeWindowMinutes: def.timeWindowMinutes,
        thresholdType: def.thresholdType,
        thresholdValue: def.thresholdValue,
        direction: def.direction,
        severity: def.severity,
        channelIds: def.channelIds,
      },
      token,
    ).then(r => r.expectNoGraphQLErrors());

    const rule = result.addMetricAlertRule.ok?.addedMetricAlertRule;
    if (rule) {
      createdRules.push({ id: rule.id, name: def.name, desiredState: def.desiredState });
      console.log(`   ✓ ${def.name} (${rule.id})`);
    } else {
      console.error(`   ✗ Failed to create: ${def.name}`);
    }
  }

  // 5. Seed state transitions, incidents, and set desired states
  console.log('\n📊 Seeding 30 days of historical data + 7 days ahead...');

  const totalHours = (DAYS_PAST + DAYS_AHEAD) * 24;
  const nowHoursFromStart = DAYS_PAST * 24;

  for (const rule of createdRules) {
    // Generate realistic state transition history
    const transitions: Array<{
      fromState: string;
      toState: string;
      value: number;
      previousValue: number;
      thresholdValue: number;
      createdAt: Date;
    }> = [];

    let currentState = 'NORMAL';
    let hour = 0;

    while (hour < totalHours) {
      // Random interval between events (4-48 hours)
      hour += Math.floor(randomBetween(4, 48));
      if (hour >= totalHours) break;

      const eventTime = hoursAgo(nowHoursFromStart - hour);
      const value = randomBetween(50, 500);
      const previousValue = randomBetween(30, 300);

      // Simulate a firing cycle: NORMAL → PENDING → FIRING → RECOVERING → NORMAL
      if (currentState === 'NORMAL') {
        transitions.push({
          fromState: 'NORMAL',
          toState: 'PENDING',
          value,
          previousValue,
          thresholdValue: value * 0.8,
          createdAt: eventTime,
        });
        currentState = 'PENDING';

        // PENDING → FIRING after a few minutes
        const firingTime = new Date(eventTime.getTime() + randomBetween(2, 10) * 60000);
        transitions.push({
          fromState: 'PENDING',
          toState: 'FIRING',
          value: value * 1.1,
          previousValue: value,
          thresholdValue: value * 0.8,
          createdAt: firingTime,
        });
        currentState = 'FIRING';

        // FIRING → RECOVERING after some time
        const recoverTime = new Date(
          firingTime.getTime() + randomBetween(10, 180) * 60000,
        );
        transitions.push({
          fromState: 'FIRING',
          toState: 'RECOVERING',
          value: value * 0.5,
          previousValue: value * 1.1,
          thresholdValue: value * 0.8,
          createdAt: recoverTime,
        });
        currentState = 'RECOVERING';

        // RECOVERING → NORMAL after confirmation
        const normalTime = new Date(
          recoverTime.getTime() + randomBetween(3, 15) * 60000,
        );
        transitions.push({
          fromState: 'RECOVERING',
          toState: 'NORMAL',
          value: value * 0.3,
          previousValue: value * 0.5,
          thresholdValue: value * 0.8,
          createdAt: normalTime,
        });
        currentState = 'NORMAL';
      }
    }

    // Insert state log entries
    const expiresAt = hoursAhead(DAYS_AHEAD * 24 + 24);
    for (const t of transitions) {
      await pool.query(psql`
        INSERT INTO "metric_alert_state_log" (
          "metric_alert_rule_id", "target_id", "from_state", "to_state",
          "value", "previous_value", "threshold_value", "created_at", "expires_at"
        ) VALUES (
          ${rule.id}, ${targetId as string}, ${t.fromState}, ${t.toState},
          ${t.value}, ${t.previousValue}, ${t.thresholdValue},
          ${t.createdAt.toISOString()}, ${expiresAt.toISOString()}
        )
      `);
    }

    // Create incidents from FIRING transitions
    const firingTransitions = transitions.filter(t => t.toState === 'FIRING');
    const resolvedTransitions = transitions.filter(t => t.fromState === 'RECOVERING' && t.toState === 'NORMAL');

    for (let i = 0; i < firingTransitions.length; i++) {
      const firing = firingTransitions[i];
      const resolved = resolvedTransitions[i];
      await pool.query(psql`
        INSERT INTO "metric_alert_incidents" (
          "metric_alert_rule_id", "started_at", "resolved_at",
          "current_value", "previous_value", "threshold_value"
        ) VALUES (
          ${rule.id}, ${firing.createdAt.toISOString()},
          ${resolved ? resolved.createdAt.toISOString() : null},
          ${firing.value}, ${firing.previousValue}, ${firing.thresholdValue}
        )
      `);
    }

    // Set desired state for live testing
    if (rule.desiredState !== 'NORMAL') {
      const stateChangedAt = hoursAgo(randomBetween(0.5, 3));
      await pool.query(psql`
        UPDATE "metric_alert_rules"
        SET
          "state" = ${rule.desiredState},
          "state_changed_at" = ${stateChangedAt.toISOString()},
          "last_evaluated_at" = NOW(),
          "updated_at" = NOW()
        WHERE "id" = ${rule.id}
      `);

      // For FIRING rules, create an open incident
      if (rule.desiredState === 'FIRING') {
        await pool.query(psql`
          INSERT INTO "metric_alert_incidents" (
            "metric_alert_rule_id", "started_at",
            "current_value", "previous_value", "threshold_value"
          ) VALUES (
            ${rule.id}, ${stateChangedAt.toISOString()},
            ${randomBetween(100, 500)}, ${randomBetween(30, 100)}, ${randomBetween(50, 200)}
          )
        `);
      }

      console.log(`   🔥 ${rule.name} → ${rule.desiredState}`);
    }

    console.log(
      `   📈 ${rule.name}: ${transitions.length} state transitions, ${firingTransitions.length} incidents`,
    );
  }

  await pool.end();

  console.log(`
✅ Metric alerts seed complete!

Credentials:
  Email:    ${OWNER_EMAIL}
  Password: ${PASSWORD}

Rules in non-NORMAL states (for polling testing):
${createdRules
  .filter(r => r.desiredState !== 'NORMAL')
  .map(r => `  ${r.desiredState.padEnd(12)} ${r.name}`)
  .join('\n')}

Navigate to:
  http://localhost:3000/${organizationSlug}/${projectSlug}/${targetSlug}/alerts
`);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
