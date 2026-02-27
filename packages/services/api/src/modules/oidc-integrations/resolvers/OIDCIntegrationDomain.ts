import { OIDCIntegrationsProvider } from '../providers/oidc-integrations.provider';
import type { OidcIntegrationDomainResolvers } from './../../../__generated__/types';

/*
 * Note: This object type is generated because "OIDCIntegrationDomainMapper" is declared. This is to ensure runtime safety.
 *
 * When a mapper is used, it is possible to hit runtime errors in some scenarios:
 * - given a field name, the schema type's field type does not match mapper's field type
 * - or a schema type's field does not exist in the mapper's fields
 *
 * If you want to skip this file generation, remove the mapper or update the pattern in the `resolverGeneration.object` config.
 */
export const OIDCIntegrationDomain: OidcIntegrationDomainResolvers = {
  challenge: async (domain, _arg, { injector }) => {
    return injector.get(OIDCIntegrationsProvider).getDomainChallenge(domain);
  },
  createdAt: ({ createdAt }, _arg, _ctx) => {
    return new Date(createdAt);
  },
  verifiedAt: ({ verifiedAt }, _arg, _ctx) => {
    if (!verifiedAt) {
      return null;
    }
    return new Date(verifiedAt);
  },
};
