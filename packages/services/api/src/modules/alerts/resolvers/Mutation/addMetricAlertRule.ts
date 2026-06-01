import { IdTranslator } from '../../../shared/providers/id-translator';
import {
  MetricAlertRuleCrossScopeError,
  MetricAlertRulesDisabledError,
  MetricAlertRulesManager,
  MetricAlertRuleValidationError,
} from '../../providers/metric-alert-rules-manager';
import { MetricAlertRuleLimitExceededError } from '../../providers/metric-alert-rules-storage';
import type { MutationResolvers } from './../../../../__generated__/types';

export const addMetricAlertRule: NonNullable<MutationResolvers['addMetricAlertRule']> = async (
  _,
  { input },
  { injector },
) => {
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId, targetId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
    translator.translateTargetId(input),
  ]);

  try {
    const rule = await injector.get(MetricAlertRulesManager).createRule({
      organizationId,
      projectId,
      targetId,
      type: input.type,
      metric: input.metric ?? null,
      timeWindowMinutes: input.timeWindowMinutes,
      thresholdType: input.thresholdType,
      thresholdValue: input.thresholdValue,
      direction: input.direction,
      severity: input.severity,
      name: input.name,
      confirmationMinutes: input.confirmationMinutes,
      savedFilterId: input.savedFilterId,
      channelIds: input.channelIds,
    });
    return { ok: { addedMetricAlertRule: rule } };
  } catch (error) {
    if (
      error instanceof MetricAlertRulesDisabledError ||
      error instanceof MetricAlertRuleValidationError ||
      error instanceof MetricAlertRuleCrossScopeError ||
      error instanceof MetricAlertRuleLimitExceededError
    ) {
      return { error: { message: error.message } };
    }
    throw error;
  }
};
