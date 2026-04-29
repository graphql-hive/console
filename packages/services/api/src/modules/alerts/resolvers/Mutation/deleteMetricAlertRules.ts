import { Session } from '../../../auth/lib/authz';
import { IdTranslator } from '../../../shared/providers/id-translator';
import { METRIC_ALERT_RULES_ENABLED } from '../../providers/metric-alert-rules-flag-token';
import { MetricAlertRulesStorage } from '../../providers/metric-alert-rules-storage';
import type { MutationResolvers } from './../../../../__generated__/types';

export const deleteMetricAlertRules: NonNullable<
  MutationResolvers['deleteMetricAlertRules']
> = async (_, { input }, { injector }) => {
  if (injector.get<boolean>(METRIC_ALERT_RULES_ENABLED) === false) {
    return {
      error: { message: 'Metric alert rules are not enabled for this instance.' },
    };
  }

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

  const deleted = await injector.get(MetricAlertRulesStorage).deleteMetricAlertRules({
    projectId,
    ruleIds: [...input.ruleIds],
  });

  return {
    ok: {
      deletedMetricAlertRuleIds: deleted.map(r => r.id),
    },
  };
};
