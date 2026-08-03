import { MetricAlertRulesStorage } from '../providers/metric-alert-rules-storage';
import type { SavedFilterResolvers } from './../../../__generated__/types';

/**
 * `SavedFilter` is owned by the saved-filters module; the alerts module only
 * contributes the `usedByAlertRulesCount` field (declared via `extend type
 * SavedFilter` in module.graphql). Keeping it here preserves the one-way module
 * dependency (alerts -> saved-filters), avoiding a cycle.
 */
export const SavedFilter: Pick<SavedFilterResolvers, 'usedByAlertRulesCount'> = {
  usedByAlertRulesCount: (savedFilter, _arg, { injector }) => {
    return injector.get(MetricAlertRulesStorage).countRulesUsingSavedFilter(savedFilter.id);
  },
};
