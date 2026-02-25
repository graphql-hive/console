import type { FastifyBaseLogger } from 'fastify';
import { type Storage } from '@hive/api';

type OidcIdLookupResponse =
  | {
      ok: true;
      id: string;
    }
  | {
      ok: false;
      title: string;
      description: string;
      status: number;
    };

export async function oidcIdLookup(
  slug: string,
  storage: Storage,
  logger: FastifyBaseLogger,
): Promise<OidcIdLookupResponse> {
  logger.debug('Looking up OIDC integration ID for organization %s', slug);
  const oidcId = await storage.getOIDCIntegrationIdForOrganizationSlug({ slug });

  if (!oidcId) {
    return {
      ok: false,
      title: 'SSO integration not found',
      description: 'Your organization lacks an SSO integration or it does not exist.',
      status: 404,
    };
  }

  return {
    ok: true,
    id: oidcId,
  };
}
