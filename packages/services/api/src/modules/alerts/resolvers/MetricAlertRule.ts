import { SavedFiltersStorage } from '../../saved-filters/providers/saved-filters-storage';
import { Storage } from '../../shared/providers/storage';
import { TargetManager } from '../../target/providers/target-manager';
import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { MetricAlertRuleResolvers } from './../../../__generated__/types';

export const MetricAlertRule: MetricAlertRuleResolvers = {
  createdBy: (rule, _, { injector }) => {
    if (!rule.createdByUserId) {
      return null;
    }
    return injector.get(Storage).getUserById({ id: rule.createdByUserId });
  },
  updatedBy: (rule, _, { injector }) => {
    if (!rule.updatedByUserId) {
      return null;
    }
    return injector.get(Storage).getUserById({ id: rule.updatedByUserId });
  },
  // Returns null when the parent rule's target has been deleted between the
  // rule fetch and this field's resolution. The cascade on
  // `metric_alert_rules.target_id ... ON DELETE CASCADE` makes this rare in
  // practice, but it CAN happen during a concurrent delete. The schema is
  // `target: Target` (nullable); frontend list views filter rules with null
  // targets at render time so a transient miss doesn't fail the whole
  // response.
  target: async (rule, _, { injector }) => {
    try {
      return await injector.get(TargetManager).getTarget({
        targetId: rule.targetId,
        projectId: rule.projectId,
        organizationId: rule.organizationId,
      });
    } catch {
      return null;
    }
  },
  channels: async (rule, _, { injector }) => {
    const storage = injector.get(MetricAlertRulesStorage);
    const channelIds = await storage.getRuleChannelIds({ ruleId: rule.id });
    return storage.getAlertChannelsByIds(channelIds);
  },
  savedFilter: (rule, _, { injector }) => {
    if (!rule.savedFilterId) {
      return null;
    }
    return injector.get(SavedFiltersStorage).getSavedFilter({ id: rule.savedFilterId });
  },
  eventCount: (rule, { from, to }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getEventCount({
      ruleId: rule.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
  currentIncident: (rule, _, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getOpenIncident({ ruleId: rule.id });
  },
  incidents: (rule, { first, after }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getIncidentConnection({
      ruleId: rule.id,
      first,
      after,
    });
  },
  stateLog: (rule, { from, to }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getStateLog({
      ruleId: rule.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
};
