import { Session } from '../../../auth/lib/authz';
import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { METRIC_ALERT_RULES_ENABLED } from '../../providers/metric-alert-rules-flag-token';
import { MetricAlertRulesStorage } from '../../providers/metric-alert-rules-storage';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateMetricAlertRule: NonNullable<
  MutationResolvers['updateMetricAlertRule']
> = async (_, { input }, { injector, session }) => {
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
  ]);

  // Feature gate: cluster env-var OR per-org flag enables. Mirrors the
  // schemaProposals pattern at schema-proposal-storage.ts:66-70.
  if (injector.get<boolean>(METRIC_ALERT_RULES_ENABLED) === false) {
    const organization = await injector
      .get(OrganizationManager)
      .getOrganization({ organizationId });
    if (organization.featureFlags.metricAlertRules === false) {
      return {
        error: { message: 'Metric alert rules are not enabled for this instance.' },
      };
    }
  }

  await injector.get(Session).assertPerformAction({
    action: 'alert:modify',
    organizationId,
    params: { organizationId, projectId },
  });

  const currentUser = await session.getViewer();

  const storage = injector.get(MetricAlertRulesStorage);

  const existing = await storage.getMetricAlertRule({ id: input.ruleId });
  if (!existing || existing.projectId !== projectId) {
    return {
      error: { message: 'Metric alert rule not found.' },
    };
  }

  // Validate metric constraint against the effective type after update
  const effectiveType = input.type ?? existing.type;
  const effectiveMetric = input.metric !== undefined ? input.metric : existing.metric;

  if (effectiveType === 'LATENCY' && !effectiveMetric) {
    return {
      error: { message: 'Metric is required for LATENCY alert type.' },
    };
  }

  if (effectiveType !== 'LATENCY' && effectiveMetric) {
    return {
      error: { message: 'Metric should only be set for LATENCY alert type.' },
    };
  }

  // Cross-scope validation: channels and the saved filter must belong to the
  // same project as the target. Only check fields actually being changed.
  if (input.channelIds) {
    const channelProjectIds = await storage.getChannelProjectIds(input.channelIds);
    if (
      channelProjectIds.length !== input.channelIds.length ||
      channelProjectIds.some(id => id !== projectId)
    ) {
      return {
        error: {
          message: 'All notification channels must belong to the same project as the target.',
        },
      };
    }
  }

  if (input.savedFilterId) {
    const filterProjectId = await storage.getSavedFilterProjectId(input.savedFilterId);
    if (filterProjectId !== projectId) {
      return {
        error: { message: 'Saved filter must belong to the same project as the target.' },
      };
    }
  }

  // Rule update + optional channel replacement happen in a single
  // transaction inside `updateMetricAlertRule`. Avoids the partial-state
  // window where the rule's row is updated but the new channel set fails
  // to land.
  const rule = await storage.updateMetricAlertRule({
    id: input.ruleId,
    updatedByUserId: currentUser.id,
    type: input.type ?? undefined,
    timeWindowMinutes: input.timeWindowMinutes ?? undefined,
    metric: input.metric ?? undefined,
    thresholdType: input.thresholdType ?? undefined,
    thresholdValue: input.thresholdValue ?? undefined,
    direction: input.direction ?? undefined,
    severity: input.severity ?? undefined,
    name: input.name ?? undefined,
    confirmationMinutes: input.confirmationMinutes ?? undefined,
    savedFilterId: input.savedFilterId ?? undefined,
    enabled: input.enabled ?? undefined,
    channelIds: input.channelIds ?? undefined,
  });

  if (!rule) {
    return {
      error: { message: 'Failed to update metric alert rule.' },
    };
  }

  return {
    ok: { updatedMetricAlertRule: rule },
  };
};
