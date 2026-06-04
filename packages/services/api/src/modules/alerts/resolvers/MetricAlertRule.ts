import { SavedFiltersStorage } from '../../saved-filters/providers/saved-filters-storage';
import { Storage } from '../../shared/providers/storage';
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
