import { Storage } from '../../shared/providers/storage';
import { OrganizationAccessTokens } from '../providers/organization-access-tokens';
import type { PersonalAccessTokenResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "PersonalAccessTokenMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const PersonalAccessToken: PersonalAccessTokenResolvers = {
  resolvedResourcePermissionGroups(accessToken, args, { injector }) {
    return injector
      .get(OrganizationAccessTokens)
      .getGraphQLResolvedResourcePermissionGroupForAccessToken(accessToken)(
      args.includeAll ?? false,
    );
  },
  createdBy: async (accessToken, _arg, { injector }) => {
    const userId = accessToken.createdByUserId ?? accessToken.userId;
    if (!userId) {
      return null;
    }
    return injector.get(Storage).getUserById({ id: userId });
  },
};
