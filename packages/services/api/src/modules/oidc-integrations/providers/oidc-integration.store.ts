import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { sha256 } from '../../auth/lib/supertokens-at-home/crypto';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';

const OIDCIntegrationDomainModel = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  oidcIntegrationId: z.string().uuid(),
  domainName: z.string(),
  createdAt: z.string().transform(date => new Date(date)),
  verifiedAt: z
    .string()
    .transform(date => new Date(date))
    .nullable(),
});

const oidcIntegrationDomainsFields = sql`
  "id"
  , "organization_id" AS "organizationId"
  , "oidc_integration_id" AS "oidcIntegrationId"
  , "domain_name" AS "domainName"
  , to_json("created_at") AS "createdAt"
  , to_json("verified_at") AS "verifiedAt"
`;

const OIDCIntegrationDomainListModel = z.array(OIDCIntegrationDomainModel);

@Injectable({
  global: true,
  scope: Scope.Operation,
})
export class OIDCIntegrationStore {
  private logger: Logger;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    @Inject(REDIS_INSTANCE) private redis: Redis,
    logger: Logger,
  ) {
    this.logger = logger.child({ module: 'OIDCIntegrationStore' });
  }

  async getDomainsForOIDCIntegrationId(oidcIntegrationId: string) {
    this.logger.debug(
      'load registered domains for oidc integration. (oidcIntegrationId=%s)',
      oidcIntegrationId,
    );

    const query = sql`
      SELECT
        ${oidcIntegrationDomainsFields}
      FROM
        "oidc_integration_domains"
      WHERE
        "oidc_integration_id" = ${oidcIntegrationId}
    `;

    return this.pool.any(query).then(OIDCIntegrationDomainListModel.parse);
  }

  async createDomain(oidcIntegrationId: string, domainName: string) {
    this.logger.debug(
      'create domain on oidc integration. (oidcIntegrationId=%s)',
      oidcIntegrationId,
    );

    const query = sql`
      INSERT INTO "oidc_integration_domains" (
        "oidc_integration_id"
        , "domain_name"
      ) VALUES (
        ${oidcIntegrationId}
        , ${domainName}
      )
      RETURNING
        ${oidcIntegrationDomainsFields}
    `;

    return this.pool.one(query).then(OIDCIntegrationDomainModel.parse);
  }

  async deleteDomain(domainId: string) {
    this.logger.debug('delete domain on oidc integration. (oidcIntegrationId=%s)', domainId);

    const query = sql`
      DELETE
      FROM
        "oidc_integration_domains"
      WHERE
        "id" = ${domainId}
    `;

    await this.pool.query(query);
  }

  async findDomainById(domainId: string) {
    const query = sql`
      SELECT
        ${oidcIntegrationDomainsFields}
      FROM
        "oidc_integration_domains"
      WHERE
        "id" = ${domainId}
    `;

    return this.pool.maybeOne(query).then(OIDCIntegrationDomainModel.nullable().parse);
  }

  async updateDomainVerifiedAt(domainId: string) {
    this.logger.debug(
      'set verified at date for domain on oidc integration. (oidcIntegrationId=%s)',
      domainId,
    );

    const query = sql`
      UPDATE
        "oidc_integration_domains"
      SET
        "verified_at" = NOW()
      WHERE
        "id" = ${domainId}
      RETURNING
        ${oidcIntegrationDomainsFields}
    `;

    return this.pool.maybeOne(query).then(OIDCIntegrationDomainModel.nullable().parse);
  }

  async createDomainChallenge(domainId: string) {
    const challenge = createChallengePayload();

    const key = `hive:oidcDomainChallenge:${domainId}`;
    await this.redis.set(key, JSON.stringify(challenge));
    await this.redis.expire(key, 60 * 60 * 24);
  }

  async deleteDomainChallenge(domainId: string) {
    const key = `hive:oidcDomainChallenge:${domainId}`;
    await this.redis.del(key);
  }

  async getDomainChallenge(domainId: string) {
    const key = `hive:oidcDomainChallenge:${domainId}`;
    const rawChallenge = await this.redis.get(key);
    if (rawChallenge === null) {
      return null;
    }
    return ChallengePayloadModel.parse(JSON.parse(rawChallenge));
  }
}

const ChallengePayloadModel = z.object({
  id: z.string(),
  recordName: z.string(),
  value: z.string(),
});

type ChallengePayload = z.TypeOf<typeof ChallengePayloadModel>;

function createChallengePayload(): ChallengePayload {
  return {
    id: crypto.randomUUID(),
    recordName: `_hive-challenge`,
    value: sha256(crypto.randomUUID()),
  };
}
