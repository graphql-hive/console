import { TargetManager } from '../providers/target-manager';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<ProjectResolvers, 'targetBySlug' | 'targets'> = {
  targets: async (project, _, { injector }) => {
    const targets = await injector.get(TargetManager).getTargets({
      projectId: project.id,
      organizationId: project.orgId,
    });

    return {
      edges: targets.map(node => ({
        cursor: '',
        node,
      })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: '',
        startCursor: '',
      },
    };
  },
  targetBySlug: (project, args, { injector }) => {
    return injector.get(TargetManager).getTargetBySlugForProject(project, args.targetSlug);
  },
};
