import 'reflect-metadata';
import {
  addMetricAlertRule as rawAddMetricAlertRule,
  deleteMetricAlertRules as rawDeleteMetricAlertRules,
  readMetricAlertRule,
  updateMetricAlertRule as rawUpdateMetricAlertRule,
} from 'testkit/flow';
import {
  AlertChannelType,
  MetricAlertRuleDirection,
  MetricAlertRuleMetric,
  MetricAlertRuleSeverity,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
  ProjectType,
} from 'testkit/gql/graphql';
import { initSeed } from '../../../testkit/seed';

test.concurrent('can create, read, update, and delete a metric alert rule', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('metricAlertRules', true);
  const {
    project,
    target,
    addAlertChannel,
    addMetricAlertRule,
    updateMetricAlertRule,
    deleteMetricAlertRules,
  } = await createProject(ProjectType.Single);

  const organizationSlug = organization.slug;
  const projectSlug = project.slug;
  const targetSlug = target.slug;

  // Create a webhook channel to attach to the rule
  const channelResult = await addAlertChannel({
    name: 'test-webhook',
    organizationSlug,
    projectSlug,
    type: AlertChannelType.Webhook,
    webhook: { endpoint: 'http://localhost:9876/webhook' },
  });
  expect(channelResult.ok).toBeTruthy();
  const channelId = channelResult.ok!.addedAlertChannel.id;

  // Create a metric alert rule
  const addResult = await addMetricAlertRule({
    target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
    name: 'P99 Latency Spike',
    type: MetricAlertRuleType.Latency,
    metric: MetricAlertRuleMetric.P99,
    timeWindowMinutes: 30,
    thresholdType: MetricAlertRuleThresholdType.FixedValue,
    thresholdValue: 200,
    direction: MetricAlertRuleDirection.Above,
    severity: MetricAlertRuleSeverity.Critical,
    channelIds: [channelId],
  });
  expect(addResult.ok).toBeTruthy();
  expect(addResult.error).toBeNull();

  const rule = addResult.ok!.addedMetricAlertRule;
  expect(rule.name).toBe('P99 Latency Spike');
  expect(rule.type).toBe('LATENCY');
  expect(rule.metric).toBe('P99');
  expect(rule.thresholdType).toBe('FIXED_VALUE');
  expect(rule.thresholdValue).toBe(200);
  expect(rule.direction).toBe('ABOVE');
  expect(rule.severity).toBe('CRITICAL');
  expect(rule.state).toBe('NORMAL');
  expect(rule.timeWindowMinutes).toBe(30);
  expect(rule.confirmationMinutes).toBe(0);
  expect(rule.enabled).toBe(true);
  expect(rule.channels).toHaveLength(1);
  expect(rule.channels[0].id).toBe(channelId);

  // Update the rule
  const updateResult = await updateMetricAlertRule({
    project: { bySelector: { organizationSlug, projectSlug } },
    ruleId: rule.id,
    name: 'Updated Latency Alert',
    thresholdValue: 300,
    severity: MetricAlertRuleSeverity.Warning,
  });
  expect(updateResult.ok).toBeTruthy();
  expect(updateResult.error).toBeNull();

  const updated = updateResult.ok!.updatedMetricAlertRule;
  expect(updated.name).toBe('Updated Latency Alert');
  expect(updated.thresholdValue).toBe(300);
  expect(updated.severity).toBe('WARNING');
  // Unchanged fields should persist
  expect(updated.type).toBe('LATENCY');
  expect(updated.metric).toBe('P99');

  // Delete the rule
  const deleteResult = await deleteMetricAlertRules({
    project: { bySelector: { organizationSlug, projectSlug } },
    ruleIds: [rule.id],
  });
  expect(deleteResult.ok).toBeTruthy();
  expect(deleteResult.ok!.deletedMetricAlertRuleIds).toContain(rule.id);
});

test.concurrent('rejects malformed metric alert UUID inputs before hitting Postgres', async ({
  expect,
}) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('metricAlertRules', true);
  const { project, target, addMetricAlertRule, updateMetricAlertRule, deleteMetricAlertRules } =
    await createProject(ProjectType.Single);

  const targetReference = {
    bySelector: {
      organizationSlug: organization.slug,
      projectSlug: project.slug,
      targetSlug: target.slug,
    },
  };

  const addResult = await addMetricAlertRule({
    target: targetReference,
    name: 'Invalid channel id',
    type: MetricAlertRuleType.Traffic,
    timeWindowMinutes: 5,
    thresholdType: MetricAlertRuleThresholdType.FixedValue,
    thresholdValue: 100,
    direction: MetricAlertRuleDirection.Above,
    severity: MetricAlertRuleSeverity.Info,
    channelIds: ['i-do-not-exist'],
  });
  expect(addResult.ok).toBeNull();
  expect(addResult.error?.message).toBe('Notification channel ID must be a valid UUID.');

  const updateResult = await updateMetricAlertRule({
    project: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug } },
    ruleId: 'xxxx-xxxx-xxxx-xxxx',
    name: 'Invalid rule id',
  });
  expect(updateResult.ok).toBeNull();
  expect(updateResult.error?.message).toBe('Metric alert rule ID must be a valid UUID.');

  const deleteResult = await deleteMetricAlertRules({
    project: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug } },
    ruleIds: ['i-do-not-exist'],
  });
  expect(deleteResult.ok).toBeNull();
  expect(deleteResult.error?.message).toBe('Metric alert rule ID must be a valid UUID.');

  const readResult = await readMetricAlertRule(
    targetReference,
    'i-do-not-exist',
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  expect(readResult.target?.metricAlertRule).toBeNull();
});

test.concurrent(
  'validates that LATENCY type requires metric and non-LATENCY rejects it',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, organization, setFeatureFlag } = await createOrg();
    await setFeatureFlag('metricAlertRules', true);
    const { project, target, addAlertChannel, addMetricAlertRule } = await createProject(
      ProjectType.Single,
    );

    const organizationSlug = organization.slug;
    const projectSlug = project.slug;
    const targetSlug = target.slug;

    const channelResult = await addAlertChannel({
      name: 'test-webhook',
      organizationSlug,
      projectSlug,
      type: AlertChannelType.Webhook,
      webhook: { endpoint: 'http://localhost:9876/webhook' },
    });
    const channelId = channelResult.ok!.addedAlertChannel.id;

    // LATENCY without metric should fail
    const noMetricResult = await addMetricAlertRule({
      target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
      name: 'Bad Latency Alert',
      type: MetricAlertRuleType.Latency,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 200,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelIds: [channelId],
      // metric intentionally omitted
    });
    expect(noMetricResult.error).toBeTruthy();
    expect(noMetricResult.error!.message).toContain('Metric is required');

    // ERROR_RATE with metric should fail
    const withMetricResult = await addMetricAlertRule({
      target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
      name: 'Bad Error Rate Alert',
      type: MetricAlertRuleType.ErrorRate,
      metric: MetricAlertRuleMetric.P99,
      timeWindowMinutes: 30,
      thresholdType: MetricAlertRuleThresholdType.PercentageChange,
      thresholdValue: 50,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Warning,
      channelIds: [channelId],
    });
    expect(withMetricResult.error).toBeTruthy();
    expect(withMetricResult.error!.message).toContain('should only be set for LATENCY');
  },
);

test.concurrent('allows creating a rule with zero channels', async ({ expect }) => {
  // Zero channels is a valid state for two reasons:
  //   1. ON DELETE CASCADE on alert_channels can leave a rule with zero
  //      channels post-creation when the only attached channel is deleted.
  //   2. It enables a "test mode" workflow where a rule can be observed
  //      transitioning state without firing notifications, then have
  //      channels attached once its behavior is trusted.
  // The UI form intentionally allows zero channels too so this workflow is
  // accessible without dropping into the API directly.
  const { createOrg } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('metricAlertRules', true);
  const { project, target, addMetricAlertRule } = await createProject(ProjectType.Single);

  const result = await addMetricAlertRule({
    target: {
      bySelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
    },
    name: 'No Channels Alert',
    type: MetricAlertRuleType.Traffic,
    timeWindowMinutes: 5,
    thresholdType: MetricAlertRuleThresholdType.FixedValue,
    thresholdValue: 1000000,
    direction: MetricAlertRuleDirection.Above,
    severity: MetricAlertRuleSeverity.Info,
    channelIds: [],
  });
  expect(result.ok).toBeTruthy();
  expect(result.error).toBeNull();
  expect(result.ok!.addedMetricAlertRule.channels).toHaveLength(0);
});

test.concurrent('supports multiple channels on a single rule', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('metricAlertRules', true);
  const { project, target, addAlertChannel, addMetricAlertRule } = await createProject(
    ProjectType.Single,
  );

  const organizationSlug = organization.slug;
  const projectSlug = project.slug;

  // Create two channels
  const channel1 = await addAlertChannel({
    name: 'webhook-1',
    organizationSlug,
    projectSlug,
    type: AlertChannelType.Webhook,
    webhook: { endpoint: 'http://localhost:9876/webhook1' },
  });
  const channel2 = await addAlertChannel({
    name: 'webhook-2',
    organizationSlug,
    projectSlug,
    type: AlertChannelType.Webhook,
    webhook: { endpoint: 'http://localhost:9876/webhook2' },
  });

  const result = await addMetricAlertRule({
    target: { bySelector: { organizationSlug, projectSlug, targetSlug: target.slug } },
    name: 'Multi-Channel Alert',
    type: MetricAlertRuleType.Traffic,
    timeWindowMinutes: 5,
    thresholdType: MetricAlertRuleThresholdType.PercentageChange,
    thresholdValue: 30,
    direction: MetricAlertRuleDirection.Above,
    severity: MetricAlertRuleSeverity.Warning,
    channelIds: [channel1.ok!.addedAlertChannel.id, channel2.ok!.addedAlertChannel.id],
  });

  expect(result.ok).toBeTruthy();
  expect(result.ok!.addedMetricAlertRule.channels).toHaveLength(2);
});

test.concurrent('enforces the per-target cap of 10 metric alert rules', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('metricAlertRules', true);
  const { project, target, addMetricAlertRule } = await createProject(ProjectType.Single);

  // Create exactly 10 rules. Each is intentionally simple (zero channels,
  // distinct names) so the cap is the only variable.
  for (let i = 0; i < 10; i++) {
    const result = await addMetricAlertRule({
      target: {
        bySelector: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
        },
      },
      name: `Rule ${i + 1}`,
      type: MetricAlertRuleType.Traffic,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 1000,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelIds: [],
    });
    expect(result.ok).toBeTruthy();
  }

  // 11th creation must return the structured limit error.
  const overflow = await addMetricAlertRule({
    target: {
      bySelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
    },
    name: 'Rule 11',
    type: MetricAlertRuleType.Traffic,
    timeWindowMinutes: 5,
    thresholdType: MetricAlertRuleThresholdType.FixedValue,
    thresholdValue: 1000,
    direction: MetricAlertRuleDirection.Above,
    severity: MetricAlertRuleSeverity.Info,
    channelIds: [],
  });
  expect(overflow.error).toBeTruthy();
  expect(overflow.error!.message).toContain('Limit of 10');
  expect(overflow.ok).toBeNull();
});

test.concurrent('deleting a rule frees a slot inside the cap', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('metricAlertRules', true);
  const { project, target, addMetricAlertRule, deleteMetricAlertRules } = await createProject(
    ProjectType.Single,
  );

  const ruleIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const result = await addMetricAlertRule({
      target: {
        bySelector: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
        },
      },
      name: `Rule ${i + 1}`,
      type: MetricAlertRuleType.Traffic,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 1000,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelIds: [],
    });
    ruleIds.push(result.ok!.addedMetricAlertRule.id);
  }

  // Delete one rule, then a fresh insert must succeed.
  const deleteResult = await deleteMetricAlertRules({
    project: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug } },
    ruleIds: [ruleIds[0]],
  });
  expect(deleteResult.ok).toBeTruthy();

  const recreate = await addMetricAlertRule({
    target: {
      bySelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
    },
    name: 'Replacement rule',
    type: MetricAlertRuleType.Traffic,
    timeWindowMinutes: 5,
    thresholdType: MetricAlertRuleThresholdType.FixedValue,
    thresholdValue: 1000,
    direction: MetricAlertRuleDirection.Above,
    severity: MetricAlertRuleSeverity.Info,
    channelIds: [],
  });
  expect(recreate.ok).toBeTruthy();
  expect(recreate.error).toBeNull();
});

test.concurrent('disabled rules still count toward the cap', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject, organization, setFeatureFlag } = await createOrg();
  await setFeatureFlag('metricAlertRules', true);
  const { project, target, addMetricAlertRule, updateMetricAlertRule } = await createProject(
    ProjectType.Single,
  );

  const ruleIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const result = await addMetricAlertRule({
      target: {
        bySelector: {
          organizationSlug: organization.slug,
          projectSlug: project.slug,
          targetSlug: target.slug,
        },
      },
      name: `Rule ${i + 1}`,
      type: MetricAlertRuleType.Traffic,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 1000,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelIds: [],
    });
    ruleIds.push(result.ok!.addedMetricAlertRule.id);
  }

  // Disable 5 of the 10 rules. The cap counts every row regardless of
  // enabled state — disabling rules should NOT free slots.
  for (let i = 0; i < 5; i++) {
    const disableResult = await updateMetricAlertRule({
      project: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug } },
      ruleId: ruleIds[i],
      enabled: false,
    });
    expect(disableResult.ok).toBeTruthy();
  }

  const overflow = await addMetricAlertRule({
    target: {
      bySelector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: target.slug,
      },
    },
    name: 'Rule 11',
    type: MetricAlertRuleType.Traffic,
    timeWindowMinutes: 5,
    thresholdType: MetricAlertRuleThresholdType.FixedValue,
    thresholdValue: 1000,
    direction: MetricAlertRuleDirection.Above,
    severity: MetricAlertRuleSeverity.Info,
    channelIds: [],
  });
  expect(overflow.error).toBeTruthy();
  expect(overflow.error!.message).toContain('Limit of 10');
});

// Regression net for cross-organization authz on metric-alert mutations.
// These tests ensure a session that has no membership in the target
// organization cannot create, update, or delete metric alert rules there,
// regardless of whether the reference is provided via slugs (`bySelector`)
// or via the raw target/project UUID (`byId`).
//
// Defense is layered. The slug-based path is rejected at slug resolution
// itself (`translateOrganizationId` requires `organization:describe`, which
// the session lacks). The id-based path is rejected at
// `assertPerformAction({ action: 'alert:modify', ... })` inside the
// manager. Both surface as top-level GraphQL errors of the shape
// "Missing permission for performing '<action>' on resource", which is the
// signature `InsufficientPermissionError` produces — that error class is
// intentionally not in the wrapped-error catch list of the resolvers, so it
// bubbles up rather than landing in `{ error: { message } }`. We assert on
// the "Missing permission for performing" prefix rather than the specific
// action so that future shifts in which precondition fires first don't
// invalidate the regression net.

test.concurrent(
  'cross-org: cannot create alert in another org using bySelector',
  async ({ expect }) => {
    const seed = initSeed();

    // Owner A's setup: org + project + target + channel (the victim).
    const { createOrg: createOrgA } = await seed.createOwner();
    const {
      createProject: createProjectA,
      organization: orgA,
      setFeatureFlag: setFeatureFlagA,
    } = await createOrgA();
    await setFeatureFlagA('metricAlertRules', true);
    const {
      project: projectA,
      target: targetA,
      addAlertChannel: addAlertChannelA,
    } = await createProjectA(ProjectType.Single);
    const channelA = await addAlertChannelA({
      name: 'channel-a',
      organizationSlug: orgA.slug,
      projectSlug: projectA.slug,
      type: AlertChannelType.Webhook,
      webhook: { endpoint: 'http://localhost:9876/webhook-a' },
    });

    // Owner B: separate owner, no membership in orgA (the attacker).
    const { ownerToken: ownerTokenB } = await seed.createOwner();

    const result = await rawAddMetricAlertRule(
      {
        target: {
          bySelector: {
            organizationSlug: orgA.slug,
            projectSlug: projectA.slug,
            targetSlug: targetA.slug,
          },
        },
        name: 'Attacker rule',
        type: MetricAlertRuleType.Traffic,
        timeWindowMinutes: 5,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 100,
        direction: MetricAlertRuleDirection.Above,
        severity: MetricAlertRuleSeverity.Info,
        channelIds: [channelA.ok!.addedAlertChannel.id],
      },
      ownerTokenB,
    ).then(r => r.expectGraphQLErrors());

    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('Missing permission for performing');
  },
);

test.concurrent(
  'cross-org: cannot create alert in another org using byId (knowing the UUID is not enough)',
  async ({ expect }) => {
    const seed = initSeed();

    const { createOrg: createOrgA } = await seed.createOwner();
    const { createProject: createProjectA, setFeatureFlag: setFeatureFlagA } = await createOrgA();
    await setFeatureFlagA('metricAlertRules', true);
    const { target: targetA } = await createProjectA(ProjectType.Single);

    const { ownerToken: ownerTokenB } = await seed.createOwner();

    // Owner B has the raw target UUID (simulating leaked/discovered ID) but
    // no membership — authz must still reject.
    const result = await rawAddMetricAlertRule(
      {
        target: { byId: targetA.id },
        name: 'Attacker rule via byId',
        type: MetricAlertRuleType.Traffic,
        timeWindowMinutes: 5,
        thresholdType: MetricAlertRuleThresholdType.FixedValue,
        thresholdValue: 100,
        direction: MetricAlertRuleDirection.Above,
        severity: MetricAlertRuleSeverity.Info,
        channelIds: [],
      },
      ownerTokenB,
    ).then(r => r.expectGraphQLErrors());

    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('Missing permission for performing');
  },
);

test.concurrent(
  'cross-org: cannot update an alert that belongs to another org',
  async ({ expect }) => {
    const seed = initSeed();

    const { createOrg: createOrgA } = await seed.createOwner();
    const {
      createProject: createProjectA,
      organization: orgA,
      setFeatureFlag: setFeatureFlagA,
    } = await createOrgA();
    await setFeatureFlagA('metricAlertRules', true);
    const {
      project: projectA,
      target: targetA,
      addMetricAlertRule: addMetricAlertRuleA,
    } = await createProjectA(ProjectType.Single);

    // Owner A creates the rule.
    const created = await addMetricAlertRuleA({
      target: {
        bySelector: {
          organizationSlug: orgA.slug,
          projectSlug: projectA.slug,
          targetSlug: targetA.slug,
        },
      },
      name: 'Owner A rule',
      type: MetricAlertRuleType.Traffic,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 100,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelIds: [],
    });
    const ruleId = created.ok!.addedMetricAlertRule.id;

    // Owner B (no membership in orgA) attempts to update it.
    const { ownerToken: ownerTokenB } = await seed.createOwner();

    const result = await rawUpdateMetricAlertRule(
      {
        project: {
          bySelector: { organizationSlug: orgA.slug, projectSlug: projectA.slug },
        },
        ruleId,
        name: 'Attacker rename',
      },
      ownerTokenB,
    ).then(r => r.expectGraphQLErrors());

    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('Missing permission for performing');
  },
);

test.concurrent(
  'cross-org: cannot delete an alert that belongs to another org',
  async ({ expect }) => {
    const seed = initSeed();

    const { createOrg: createOrgA } = await seed.createOwner();
    const {
      createProject: createProjectA,
      organization: orgA,
      setFeatureFlag: setFeatureFlagA,
    } = await createOrgA();
    await setFeatureFlagA('metricAlertRules', true);
    const {
      project: projectA,
      target: targetA,
      addMetricAlertRule: addMetricAlertRuleA,
    } = await createProjectA(ProjectType.Single);

    const created = await addMetricAlertRuleA({
      target: {
        bySelector: {
          organizationSlug: orgA.slug,
          projectSlug: projectA.slug,
          targetSlug: targetA.slug,
        },
      },
      name: 'Owner A rule',
      type: MetricAlertRuleType.Traffic,
      timeWindowMinutes: 5,
      thresholdType: MetricAlertRuleThresholdType.FixedValue,
      thresholdValue: 100,
      direction: MetricAlertRuleDirection.Above,
      severity: MetricAlertRuleSeverity.Info,
      channelIds: [],
    });
    const ruleId = created.ok!.addedMetricAlertRule.id;

    const { ownerToken: ownerTokenB } = await seed.createOwner();

    const result = await rawDeleteMetricAlertRules(
      {
        project: {
          bySelector: { organizationSlug: orgA.slug, projectSlug: projectA.slug },
        },
        ruleIds: [ruleId],
      },
      ownerTokenB,
    ).then(r => r.expectGraphQLErrors());

    expect(result).toHaveLength(1);
    expect(result[0].message).toContain('Missing permission for performing');
  },
);
