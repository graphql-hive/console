import { OIDCIntegration as TOIDCIntegration } from '../../../shared/entities';
import { AccessError } from '../../../shared/errors';
import { OrganizationMemberRoles } from '../../organization/providers/organization-member-roles';
import { ResourceAssignments } from '../../organization/providers/resource-assignments';
import { OIDCIntegrationsProvider } from '../providers/oidc-integrations.provider';
import type { OidcIntegrationResolvers } from './../../../__generated__/types';

const canModifyMap = new WeakMap<TOIDCIntegration, boolean>();
const modifyGuard =
  <
    TArgs,
    TValue,
    TResolver extends (
      oidcIntegration: TOIDCIntegration,
      args: TArgs,
      ctx: GraphQLModules.ModuleContext,
    ) => Promise<TValue> | TValue,
  >(
    resolver: TResolver,
  ) =>
  async (...[oidcIntegration, args, ctx]: Parameters<TResolver>): Promise<TValue> => {
    let canModify = canModifyMap.get(oidcIntegration);
    if (canModify == null) {
      canModify = await ctx.session.canPerformAction({
        organizationId: oidcIntegration.linkedOrganizationId,
        action: 'oidc:modify',
        params: {
          organizationId: oidcIntegration.linkedOrganizationId,
        },
      });
      canModifyMap.set(oidcIntegration, canModify);
    }
    if (!canModify) {
      throw new AccessError('Not authorized to modify OIDC integration');
    }
    return resolver(oidcIntegration, args, ctx);
  };

export const OIDCIntegration: OidcIntegrationResolvers = {
  id: oidcIntegration => oidcIntegration.id,
  tokenEndpoint: modifyGuard(oidcIntegration => oidcIntegration.tokenEndpoint),
  userinfoEndpoint: modifyGuard(oidcIntegration => oidcIntegration.userinfoEndpoint),
  authorizationEndpoint: modifyGuard(oidcIntegration => oidcIntegration.authorizationEndpoint),
  clientId: modifyGuard(oidcIntegration => oidcIntegration.clientId),
  clientSecretPreview: modifyGuard((oidcIntegration, _, { injector }) =>
    injector.get(OIDCIntegrationsProvider).getClientSecretPreview(oidcIntegration),
  ),
  activeWithCurrentSession: async (oidcIntegration, _, { session }) => {
    const actor = await session.getActor().catch(() => {});
    return actor?.type === 'user' && oidcIntegration.id === actor.oidcIntegrationId;
  },
  /**
   * Fallbacks to Viewer if default member role is not set
   */
  defaultMemberRole: modifyGuard(async (oidcIntegration, _, { injector }) => {
    if (oidcIntegration.defaultMemberRoleId) {
      const role = await injector
        .get(OrganizationMemberRoles)
        .findMemberRoleById(oidcIntegration.defaultMemberRoleId);

      if (!role) {
        throw new Error(
          `Default role not found (role_id=${oidcIntegration.defaultMemberRoleId}, organization=${oidcIntegration.linkedOrganizationId})`,
        );
      }

      return role;
    }

    const role = await injector
      .get(OrganizationMemberRoles)
      .findViewerRoleByOrganizationId(oidcIntegration.linkedOrganizationId);

    if (!role) {
      throw new Error(
        `Viewer role not found (organization=${oidcIntegration.linkedOrganizationId})`,
      );
    }

    return role;
  }),
  defaultResourceAssignment: modifyGuard(async (oidcIntegration, _, { injector }) => {
    if (!oidcIntegration.defaultResourceAssignment) {
      return null;
    }

    return injector.get(ResourceAssignments).resolveGraphQLMemberResourceAssignment({
      organizationId: oidcIntegration.linkedOrganizationId,
      resources: oidcIntegration.defaultResourceAssignment,
    });
  }),
};
