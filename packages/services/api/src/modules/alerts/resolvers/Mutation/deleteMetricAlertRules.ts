import { IdTranslator } from '../../../shared/providers/id-translator';
import {
  MetricAlertRulesDisabledError,
  MetricAlertRulesManager,
} from '../../providers/metric-alert-rules-manager';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteMetricAlertRules: NonNullable<
  MutationResolvers['deleteMetricAlertRules']
> = async (_, { input }, { injector }) => {
  const translator = injector.get(IdTranslator);
  const [organizationId, projectId] = await Promise.all([
    translator.translateOrganizationId(input),
    translator.translateProjectId(input),
  ]);

  try {
    const deletedMetricAlertRuleIds = await injector.get(MetricAlertRulesManager).deleteRules({
      organizationId,
      projectId,
      ruleIds: input.ruleIds,
    });
    return { ok: { deletedMetricAlertRuleIds } };
  } catch (error) {
    if (error instanceof MetricAlertRulesDisabledError) {
      return { error: { message: error.message } };
    }
    throw error;
  }
};
