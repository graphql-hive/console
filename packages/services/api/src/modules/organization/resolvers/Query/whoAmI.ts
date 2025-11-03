import { HiveError } from '@hive/api/shared/errors';
import { OrganizationAccessTokenSession } from '../../../auth/lib/organization-access-token-strategy';
import { TargetAccessTokenSession } from '../../../auth/lib/target-access-token-strategy';
import { OrganizationAccessTokens } from '../../providers/organization-access-tokens';
import type { QueryResolvers } from './../../../../__generated__/types';

export const whoAmI: NonNullable<QueryResolvers['whoAmI']> = async (
  _,
  args,
  { session, injector },
  info,
) => {
  const accessTokens = injector.get(OrganizationAccessTokens);

  if (session instanceof OrganizationAccessTokenSession) {
    const accessToken = await accessTokens.getById(session.id);

    if (!accessToken) {
      throw new Error('This one is invalid :D');
    }

    const resolvedPermissions =
      accessTokens.getGraphQLResolvedResourcePermissionGroupForAccessToken(accessToken);

    return {
      title: `Access Token - ${accessToken.title}`,
      resolvedPermissions,
    };
  }

  if (session instanceof TargetAccessTokenSession) {
    const resolvedPermissions =
      accessTokens.getGraphQLResolvedResourcePermissionGroupForAccessToken({
        projectId: session.projectId,
        organizationId: session.organizationId,
        assignedResources: {
          mode: 'granular',
          projects: [
            {
              id: session.projectId,
              targets: {
                mode: '*',
              },
              type: 'project',
            },
          ],
        },
        permissions: session.allowedPermissions,
      });

    return {
      title: `Legacy Target Access Token - ${session.id}`,
      resolvedPermissions,
    };
  }

  throw new HiveError('Currently not supported.');
};
