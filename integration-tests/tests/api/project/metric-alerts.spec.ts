import 'reflect-metadata';
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
    target: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug, targetSlug: target.slug } },
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
      target: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug, targetSlug: target.slug } },
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
    target: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug, targetSlug: target.slug } },
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
      target: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug, targetSlug: target.slug } },
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
    target: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug, targetSlug: target.slug } },
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
      target: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug, targetSlug: target.slug } },
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
    target: { bySelector: { organizationSlug: organization.slug, projectSlug: project.slug, targetSlug: target.slug } },
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
