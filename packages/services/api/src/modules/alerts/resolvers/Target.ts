import {
  ALERT_STATE_LOG_RETENTION_DAYS,
  METRIC_ALERT_RULES_PER_TARGET_LIMIT,
} from '../../commerce/constants';
import { OrganizationManager } from '../../organization/providers/organization-manager';
import { MetricAlertRulesManager } from '../providers/metric-alert-rules-manager';
import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'metricAlertRule'
  | 'metricAlertRuleStateLog'
  | 'metricAlertRules'
  | 'metricAlertRulesLimit'
  | 'metricAlertStateLogRetentionDays'
  | 'viewerCanUseMetricAlertRules'
> = {
  metricAlertRules: async (target, _, { injector }) => {
    if (!(await injector.get(MetricAlertRulesManager).canViewerUseMetricAlertRules(target.orgId))) {
      return [];
    }
    return injector.get(MetricAlertRulesStorage).getMetricAlertRulesByTarget({
      targetId: target.id,
    });
  },
  metricAlertRule: async (target, { id }, { injector }) => {
    if (!(await injector.get(MetricAlertRulesManager).canViewerUseMetricAlertRules(target.orgId))) {
      return null;
    }
    const rule = await injector.get(MetricAlertRulesStorage).getMetricAlertRule({ id });
    if (!rule || rule.targetId !== target.id) {
      return null;
    }
    return rule;
  },
  metricAlertRuleStateLog: async (target, { from, to }, { injector }) => {
    if (!(await injector.get(MetricAlertRulesManager).canViewerUseMetricAlertRules(target.orgId))) {
      return [];
    }
    return injector.get(MetricAlertRulesStorage).getStateLogByTarget({
      targetId: target.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
  viewerCanUseMetricAlertRules: (target, _args, { injector }) => {
    return injector.get(MetricAlertRulesManager).canViewerUseMetricAlertRules(target.orgId);
  },
  metricAlertStateLogRetentionDays: async (target, _args, { injector }) => {
    const organization = await injector
      .get(OrganizationManager)
      .getOrganization({ organizationId: target.orgId });
    const plan = organization.billingPlan as keyof typeof ALERT_STATE_LOG_RETENTION_DAYS;
    return ALERT_STATE_LOG_RETENTION_DAYS[plan] ?? ALERT_STATE_LOG_RETENTION_DAYS.HOBBY;
  },
  metricAlertRulesLimit: () => METRIC_ALERT_RULES_PER_TARGET_LIMIT,
};
