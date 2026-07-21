import { IdTranslator } from '../../../shared/providers/id-translator';
import {
  MetricAlertRuleCrossScopeError,
  MetricAlertRuleFilterNotShareableError,
  MetricAlertRulesDisabledError,
  MetricAlertRulesManager,
  MetricAlertRuleValidationError,
} from '../../providers/metric-alert-rules-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const updateMetricAlertRule: NonNullable<
  MutationResolvers['updateMetricAlertRule']
> = async (_, { input }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const resolved = await translator.resolveProjectReference({ reference: input.project });
  if (resolved === null) {
    return { error: { message: 'Project not found' } };
  }
  const { organizationId, projectId } = resolved;

  try {
    const rule = await injector.get(MetricAlertRulesManager).updateRule({
      organizationId,
      projectId,
      ruleId: input.ruleId,
      type: input.type,
      metric: input.metric,
      timeWindowMinutes: input.timeWindowMinutes,
      thresholdType: input.thresholdType,
      thresholdValue: input.thresholdValue,
      direction: input.direction,
      severity: input.severity,
      name: input.name,
      confirmationMinutes: input.confirmationMinutes,
      savedFilterId: input.savedFilterId,
      enabled: input.enabled,
      channelIds: input.channelIds,
    });
    return { ok: { updatedMetricAlertRule: rule } };
  } catch (error) {
    if (
      error instanceof MetricAlertRulesDisabledError ||
      error instanceof MetricAlertRuleValidationError ||
      error instanceof MetricAlertRuleCrossScopeError ||
      error instanceof MetricAlertRuleFilterNotShareableError
    ) {
      return { error: { message: error.message } };
    }
    throw error;
  }
};
