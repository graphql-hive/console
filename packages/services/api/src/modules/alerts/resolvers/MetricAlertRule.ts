import { Session } from '../../auth/lib/authz';
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
  degradedChannels: (rule, _, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getDegradedChannels({ ruleId: rule.id });
  },
  savedFilter: async (rule, _, { injector }) => {
    if (!rule.savedFilterId) {
      return null;
    }
    const filter = await injector
      .get(SavedFiltersStorage)
      .getSavedFilter({ id: rule.savedFilterId });
    if (!filter) {
      return null;
    }
    // A private saved filter is only visible to its creator. With shared-only
    // enforcement on attach this is belt-and-suspenders, but it stops a
    // grandfathered private filter's conditions from leaking to other viewers
    // of this (shared) alert. (`SavedFiltersStorage.getSavedFilter` is
    // visibility-agnostic, unlike the provider...hence the guard here.)
    if (filter.visibility === 'private') {
      const viewer = await injector.get(Session).getViewer();
      if (filter.createdByUserId !== viewer.id) {
        return null;
      }
    }
    return filter;
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
  incidentCount: (rule, _, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getIncidentCount({ ruleId: rule.id });
  },
  stateLog: (rule, { from, to }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getStateLog({
      ruleId: rule.id,
      from: new Date(from),
      to: new Date(to),
    });
  },
  stateAt: (rule, { timestamp }, { injector }) => {
    return injector.get(MetricAlertRulesStorage).getStateAt({
      ruleId: rule.id,
      timestamp: new Date(timestamp),
    });
  },
};
