import { SavedFiltersStorage } from '../../saved-filters/providers/saved-filters-storage';
import { Storage } from '../../shared/providers/storage';
import { TargetManager } from '../../target/providers/target-manager';
import { AlertsManager } from '../providers/alerts-manager';
import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { MetricAlertRuleResolvers } from './../../../__generated__/types';

export const MetricAlertRule: MetricAlertRuleResolvers = {
  createdBy: (rule, _, { injector }) => {
    if (!rule.createdByUserId) {
      return null;
    }
    return injector.get(Storage).getUserById({ id: rule.createdByUserId });
  },
  target: (rule, _, { injector }) => {
    return injector.get(TargetManager).getTarget({
      targetId: rule.targetId,
      projectId: rule.projectId,
      organizationId: rule.organizationId,
    });
  },
  channels: async (rule, _, { injector }) => {
    const channelIds = await injector.get(MetricAlertRulesStorage).getRuleChannelIds({
      ruleId: rule.id,
    });
    const allChannels = await injector.get(AlertsManager).getChannels({
      organizationId: rule.organizationId,
      projectId: rule.projectId,
    });
    return allChannels.filter(c => channelIds.includes(c.id));
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
  incidentHistory: (rule, { limit, offset }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getIncidentHistory({
      ruleId: rule.id,
      limit: limit ?? 20,
      offset: offset ?? 0,
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
