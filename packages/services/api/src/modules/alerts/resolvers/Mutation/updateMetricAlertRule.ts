import { Session } from '../../../auth/lib/authz';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { MetricAlertRulesStorage } from '../../providers/metric-alert-rules-storage';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateMetricAlertRule: NonNullable<
  MutationResolvers['updateMetricAlertRule']
> = async (_, { input }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
  ]);

  await injector.get(Session).assertPerformAction({
    action: 'alert:modify',
    organizationId,
    params: { organizationId, projectId },
  });

  const storage = injector.get(MetricAlertRulesStorage);

  const existing = await storage.getMetricAlertRule({ id: input.ruleId });
  if (!existing || existing.projectId !== projectId) {
    return {
      error: { message: 'Metric alert rule not found.' },
    };
  }

  const rule = await storage.updateMetricAlertRule({
    id: input.ruleId,
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
  });

  if (!rule) {
    return {
      error: { message: 'Failed to update metric alert rule.' },
    };
  }

  if (input.channelIds) {
    await storage.setRuleChannels({
      ruleId: rule.id,
      channelIds: [...input.channelIds],
    });
  }

  return {
    ok: { updatedMetricAlertRule: rule },
  };
};
