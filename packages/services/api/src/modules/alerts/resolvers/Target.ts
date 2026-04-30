import { OrganizationManager } from '../../organization/providers/organization-manager';
import { METRIC_ALERT_RULES_ENABLED } from '../providers/metric-alert-rules-flag-token';
import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { TargetResolvers } from './../../../__generated__/types';

// OR-style feature gate: cluster env-var OR per-org flag enables the feature.
// Mirrors the schemaProposals pattern at collection/resolvers/Target.ts:33-45.
async function isMetricAlertRulesEnabled(
  injector: GraphQLModules.ModuleContext['injector'],
  organizationId: string,
): Promise<boolean> {
  if (injector.get<boolean>(METRIC_ALERT_RULES_ENABLED) === true) {
    return true;
  }
  const organization = await injector.get(OrganizationManager).getOrganization({ organizationId });
  return organization.featureFlags.metricAlertRules;
}

export const Target: Pick<
  TargetResolvers,
  | 'metricAlertRule'
  | 'metricAlertRuleStateLog'
  | 'metricAlertRules'
  | 'viewerCanUseMetricAlertRules'
> = {
  metricAlertRules: async (target, _, { injector }) => {
    if (!(await isMetricAlertRulesEnabled(injector, target.orgId))) {
      return [];
    }
    return injector.get(MetricAlertRulesStorage).getMetricAlertRulesByTarget({
      targetId: target.id,
    });
  },
  metricAlertRule: async (target, { id }, { injector }) => {
    if (!(await isMetricAlertRulesEnabled(injector, target.orgId))) {
      return null;
    }
    const rule = await injector.get(MetricAlertRulesStorage).getMetricAlertRule({ id });
    if (!rule || rule.targetId !== target.id) {
      return null;
    }
    return rule;
  },
  metricAlertRuleStateLog: async (target, { from, to }, { injector }) => {
    if (!(await isMetricAlertRulesEnabled(injector, target.orgId))) {
      return [];
    }
    return injector.get(MetricAlertRulesStorage).getStateLogByTarget({
      targetId: target.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
  viewerCanUseMetricAlertRules: (target, _args, { injector }) => {
    return isMetricAlertRulesEnabled(injector, target.orgId);
  },
};
