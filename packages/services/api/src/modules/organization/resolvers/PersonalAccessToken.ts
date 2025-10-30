import { PersonalAccessTokens } from '../providers/personal-access-tokens';
import { ResourceAssignments } from '../providers/resource-assignments';
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
  async resources(personalAccessToken, _arg, { injector }) {
    const resources = await injector
      .get(PersonalAccessTokens)
      .getResourcesForPersonalAccessToken(personalAccessToken);

    return injector.get(ResourceAssignments).resolveGraphQLMemberResourceAssignment({
      organizationId: personalAccessToken.organizationId,
      resources,
    });
  },
  async permissions(personalAccessToken, _arg, { injector }) {
    const permissions = await injector
      .get(PersonalAccessTokens)
      .getPermissionsForPersonalAccessToken(personalAccessToken);

    return Array.from(permissions);
  },
  hasAllPermissionsFromOwner: async (personalAccessToken, _arg, _ctx) => {
    return personalAccessToken.permissions === null;
  },
};
