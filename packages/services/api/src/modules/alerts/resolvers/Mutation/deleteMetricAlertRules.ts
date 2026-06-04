import { IdTranslator } from '../../../shared/providers/id-translator';
import {
  MetricAlertRulesDisabledError,
  MetricAlertRulesManager,
  MetricAlertRuleValidationError,
} from '../../providers/metric-alert-rules-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteMetricAlertRules: NonNullable<
  MutationResolvers['deleteMetricAlertRules']
> = async (_, { input }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const resolved = await translator.resolveProjectReference({ reference: input.project });
  if (resolved === null) {
    return { error: { message: 'Project not found' } };
  }
  const { organizationId, projectId } = resolved;

  try {
    const deletedMetricAlertRuleIds = await injector.get(MetricAlertRulesManager).deleteRules({
      organizationId,
      projectId,
      ruleIds: input.ruleIds,
    });
    return { ok: { deletedMetricAlertRuleIds } };
  } catch (error) {
    if (
      error instanceof MetricAlertRulesDisabledError ||
      error instanceof MetricAlertRuleValidationError
    ) {
      return { error: { message: error.message } };
    }
    throw error;
  }
};
