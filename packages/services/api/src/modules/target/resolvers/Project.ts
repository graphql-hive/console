import { TargetManager } from '../providers/target-manager';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<ProjectResolvers, 'targetBySlug' | 'targets'> = {
  targets: (project, args, { injector }) => {
    return injector.get(TargetManager).getPaginatedTargetsForProject(project, {
      first: args.first ?? null,
      after: args.after ?? null,
      search: args.search ?? null,
      sort: args.sort ?? null,
    });
  },
  targetBySlug: (project, args, { injector }) => {
    return injector.get(TargetManager).getTargetBySlugForProject(project, args.targetSlug);
  },
};
