import { ResourceSelector } from '../providers/resource-selector';
import type { TargetForResourceSelectorResolvers } from './../../../__generated__/types';

export const TargetForResourceSelector: TargetForResourceSelectorResolvers = {
  services: async (target, _arg, { injector }) => {
    return await injector.get(ResourceSelector).getServicesFromTargetForResourceSelector(target);
  },
  appDeployments: async (target, _arg, { injector }) => {
    return await injector
      .get(ResourceSelector)
      .getAppDeploymentsFromTargetForResourceSelector(target);
  },
};
