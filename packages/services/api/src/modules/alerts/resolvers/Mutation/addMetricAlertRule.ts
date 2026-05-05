import { Session } from '../../../auth/lib/authz';
import { OrganizationManager } from '../../../organization/providers/organization-manager';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { METRIC_ALERT_RULES_ENABLED } from '../../providers/metric-alert-rules-flag-token';
import { MetricAlertRulesStorage } from '../../providers/metric-alert-rules-storage';
import type { MutationResolvers } from './../../../../__generated__/types';

export const addMetricAlertRule: NonNullable<MutationResolvers['addMetricAlertRule']> = async (
  _,
  { input },
  { injector, session },
) => {
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId, targetId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
    translator.translateTargetId(input),
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

  if (input.type === 'LATENCY' && !input.metric) {
    return {
      error: { message: 'Metric is required for LATENCY alert type.' },
    };
  }

  if (input.type !== 'LATENCY' && input.metric) {
    return {
      error: { message: 'Metric should only be set for LATENCY alert type.' },
    };
  }

  if (input.channelIds.length === 0) {
    return {
      error: { message: 'At least one channel is required.' },
    };
  }

  const storage = injector.get(MetricAlertRulesStorage);

  // Cross-scope validation: channels and the saved filter must belong to the
  // same project as the target. The DB FKs allow cross-project references on
  // their own; explicit checks close that gap.
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

  if (input.savedFilterId) {
    const filterProjectId = await storage.getSavedFilterProjectId(input.savedFilterId);
    if (filterProjectId !== projectId) {
      return {
        error: { message: 'Saved filter must belong to the same project as the target.' },
      };
    }
  }

  // The rule row + channel-link rows are written in a single transaction
  // inside `addMetricAlertRule` so a failure on either side rolls back the
  // other. Avoids the previously-possible "rule with no channels" partial
  // state when the channel insert errored after the rule was already
  // committed.
  const rule = await storage.addMetricAlertRule({
    organizationId,
    projectId,
    targetId,
    createdByUserId: currentUser.id,
    type: input.type,
    timeWindowMinutes: input.timeWindowMinutes,
    metric: input.metric ?? null,
    thresholdType: input.thresholdType,
    thresholdValue: input.thresholdValue,
    direction: input.direction,
    severity: input.severity,
    name: input.name,
    confirmationMinutes: input.confirmationMinutes ?? 0,
    savedFilterId: input.savedFilterId ?? null,
    channelIds: input.channelIds,
  });

  return {
    ok: { addedMetricAlertRule: rule },
  };
};
