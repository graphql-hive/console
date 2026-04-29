import { Session } from '../../../auth/lib/authz';
import { IdTranslator } from '../../../shared/providers/id-translator';
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
  });

  await storage.setRuleChannels({
    ruleId: rule.id,
    channelIds: [...input.channelIds],
  });

  return {
    ok: { addedMetricAlertRule: rule },
  };
};
