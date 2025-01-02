import { ProjectType } from '../../../shared/entities';
import { OrganizationManager } from '../../organization/providers/organization-manager';
import type { ProjectResolvers } from './../../../__generated__/types';

export const Project: Pick<
  ProjectResolvers,
  | 'buildUrl'
  | 'cleanId'
  | 'experimental_nativeCompositionPerTarget'
  | 'id'
  | 'name'
  | 'slug'
  | 'type'
  | 'validationUrl'
  | 'viewerCanCreateTarget'
  | 'viewerCanDelete'
  | 'viewerCanModifyAlerts'
  | 'viewerCanModifySettings'
  | '__isTypeOf'
> = {
  experimental_nativeCompositionPerTarget: async (project, _, { injector }) => {
    if (project.type !== ProjectType.FEDERATION) {
      return false;
    }

    if (!project.nativeFederation) {
      return false;
    }

    const organization = await injector.get(OrganizationManager).getOrganization({
      organizationId: project.orgId,
    });

    return organization.featureFlags.forceLegacyCompositionInTargets.length > 0;
  },
  cleanId: project => project.slug,
  viewerCanCreateTarget: (project, _arg, { session }) => {
    return session.canPerformAction({
      action: 'target:create',
      organizationId: project.orgId,
      params: {
        organizationId: project.orgId,
        projectId: project.id,
      },
    });
  },
  viewerCanModifyAlerts: (project, _arg, { session }) => {
    return session.canPerformAction({
      action: 'alert:modify',
      organizationId: project.orgId,
      params: {
        organizationId: project.orgId,
        projectId: project.id,
      },
    });
  },
  viewerCanDelete: (project, _arg, { session }) => {
    return session.canPerformAction({
      action: 'project:delete',
      organizationId: project.orgId,
      params: {
        organizationId: project.orgId,
        projectId: project.id,
      },
    });
  },
  viewerCanModifySettings: (project, _arg, { session }) => {
    return session.canPerformAction({
      action: 'project:modifySettings',
      organizationId: project.orgId,
      params: {
        organizationId: project.orgId,
        projectId: project.id,
      },
    });
  },
};
