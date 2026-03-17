import { ResourceSelector } from '../providers/resource-selector';
import type { ProjectForResourceSelectorResolvers } from './../../../__generated__/types';

export const ProjectForResourceSelector: ProjectForResourceSelectorResolvers = {
  targets: async (project, _arg, { injector }) => {
    return await injector
      .get(ResourceSelector)
      .getTargetsFromOrganizationForResourceSelector(project);
  },
  target: async (project, args, { injector }) => {
    return await injector
      .get(ResourceSelector)
      .getTargetFromOrganizationForResourceSelector(project, args.targetId);
  },
};
