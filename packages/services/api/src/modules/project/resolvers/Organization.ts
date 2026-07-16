import { Session } from '../../auth/lib/authz';
import { ProjectManager } from '../providers/project-manager';
import type { OrganizationResolvers } from './../../../__generated__/types';

export const Organization: Pick<
  OrganizationResolvers,
  'projectBySlug' | 'projects' | 'viewerCanCreateProject'
> = {
  projects: (organization, args, { injector }) => {
    return injector.get(ProjectManager).getPaginatedProjectsForOrganization(organization, {
      first: args.first ?? null,
      after: args.after ?? null,
      search: args.search ?? null,
      sort: args.sort ?? null,
    });
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
