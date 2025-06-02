import { OrganizationManager } from '../../organization/providers/organization-manager';
import { ProjectManager } from '../../project/providers/project-manager';
import { TargetManager } from '../providers/target-manager';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'cleanId'
  | 'conditionalBreakingChangeConfiguration'
  | 'experimental_forcedLegacySchemaComposition'
  | 'failDiffOnDangerousChange'
  | 'graphqlEndpointUrl'
  | 'id'
  | 'name'
  | 'project'
  | 'slug'
  | 'viewerCanAccessSettings'
  | 'viewerCanDelete'
  | 'viewerCanModifyCDNAccessToken'
  | 'viewerCanModifySettings'
  | 'viewerCanModifyTargetAccessToken'
  | '__isTypeOf'
> = {
  project: (target, _args, { injector }) =>
    injector.get(ProjectManager).getProject({
      projectId: target.projectId,
      organizationId: target.orgId,
    }),
  experimental_forcedLegacySchemaComposition: (target, _, { injector }) => {
    return injector
      .get(OrganizationManager)
      .getFeatureFlags({
        organizationId: target.orgId,
      })
      .then(flags => flags.forceLegacyCompositionInTargets.includes(target.id));
  },
  cleanId: target => target.slug,
  viewerCanAccessSettings: async (target, _arg, { session }) => {
    return Promise.all([
      session.canPerformAction({
        action: 'target:modifySettings',
        organizationId: target.orgId,
        params: {
          organizationId: target.orgId,
          projectId: target.projectId,
          targetId: target.id,
        },
      }),
      session.canPerformAction({
        action: 'cdnAccessToken:modify',
        organizationId: target.orgId,
        params: {
          organizationId: target.orgId,
          projectId: target.projectId,
          targetId: target.id,
        },
      }),
      session.canPerformAction({
        action: 'targetAccessToken:modify',
        organizationId: target.orgId,
        params: {
          organizationId: target.orgId,
          projectId: target.projectId,
          targetId: target.id,
        },
      }),
    ]).then(checks => checks.some(Boolean));
  },
  viewerCanModifyTargetAccessToken: (target, _arg, { session }) => {
    return session.canPerformAction({
      action: 'targetAccessToken:modify',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });
  },
  viewerCanModifyCDNAccessToken: (target, _arg, { session }) => {
    return session.canPerformAction({
      action: 'cdnAccessToken:modify',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });
  },
  viewerCanDelete: (target, _arg, { session }) => {
    return session.canPerformAction({
      action: 'target:delete',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });
  },
  viewerCanModifySettings: (target, _arg, { session }) => {
    return session.canPerformAction({
      action: 'target:modifySettings',
      organizationId: target.orgId,
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });
  },
  conditionalBreakingChangeConfiguration: async (target, _arg, { injector }) => {
    const targetManager = injector.get(TargetManager);

    const settings = await targetManager.getTargetSettings({
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
    });

    return {
      ...settings.validation,
      targets: await Promise.all(
        settings.validation.targets.map(tid =>
          targetManager.getTarget({
            organizationId: target.orgId,
            projectId: target.projectId,
            targetId: tid,
          }),
        ),
      ),
    };
  },
};
