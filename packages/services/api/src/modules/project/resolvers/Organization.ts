import { Session } from '../../auth/lib/authz';
import { ProjectManager } from '../providers/project-manager';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  'projectBySlug' | 'projects' | 'viewerCanCreateProject'
> = {
  projects: async (organization, _, { injector }) => {
    const projects = await injector
      .get(ProjectManager)
      .getProjects({ organizationId: organization.id });

    return {
      edges: projects.map(node => ({
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
  viewerCanCreateProject: async (organization, _arg, { injector }) => {
    return injector.get(Session).canPerformAction({
      action: 'project:create',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
      },
    });
  },
  projectBySlug: async (organization, args, { injector }) => {
    return injector
      .get(ProjectManager)
      .getProjectBySlugForOrganization(organization, args.projectSlug);
  },
};
