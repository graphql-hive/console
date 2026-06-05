import type { UserResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "UserMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const User: Pick<UserResolvers, 'provisionInfo'> = {
  /* Implement User resolver logic here */
  provisionInfo: async (user, _arg, _ctx) => {
    if (!user.provisionedByOrganizationId) {
      return null;
    }

    return {
      isDisabled: user.deactivatedAt !== null,
    };
  },
};
