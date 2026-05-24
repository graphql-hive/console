import { Inject, Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import { sha256 } from '../../auth/lib/supertokens-at-home/crypto';
import { Logger } from '../../shared/providers/logger';
import { REDIS_INSTANCE, type Redis } from '../../shared/providers/redis';

const SharedOIDCIntegrationDomainFieldsModel = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  oidcIntegrationId: z.string().uuid(),
  domainName: z.string().transform(name => name.toLowerCase()),
  createdAt: z.string(),
});

const PendingOIDCIntegrationDomainModel = SharedOIDCIntegrationDomainFieldsModel.extend({
  verifiedAt: z.null(),
});

const ValidatedOIDCIntegrationDomainModel = SharedOIDCIntegrationDomainFieldsModel.extend({
  verifiedAt: z.string(),
});

const OIDCIntegrationDomainModel = z.union([
  PendingOIDCIntegrationDomainModel,
  ValidatedOIDCIntegrationDomainModel,
]);

export type OIDCIntegrationDomain = z.TypeOf<typeof OIDCIntegrationDomainModel>;

const oidcIntegrationDomainsFields = psql`
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
    private pool: PostgresDatabasePool,
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

    const query = psql`
      SELECT
        ${oidcIntegrationDomainsFields}
      FROM
        "oidc_integration_domains"
      WHERE
        "oidc_integration_id" = ${oidcIntegrationId}
    `;

    return this.pool.any(query).then(OIDCIntegrationDomainListModel.parse);
  }

  async createDomain(organizationId: string, oidcIntegrationId: string, domainName: string) {
    this.logger.debug(
      'create domain on oidc integration. (oidcIntegrationId=%s)',
      oidcIntegrationId,
    );

    const query = psql`
      INSERT INTO "oidc_integration_domains" (
        "organization_id"
        , "oidc_integration_id"
        , "domain_name"
      ) VALUES (
        ${organizationId}
        , ${oidcIntegrationId}
        , ${domainName.toLowerCase()}
      )
      ON CONFLICT ("oidc_integration_id", "domain_name")
        DO NOTHING
      RETURNING
        ${oidcIntegrationDomainsFields}
    `;

    return this.pool.maybeOne(query).then(OIDCIntegrationDomainModel.nullable().parse);
  }

  async deleteDomain(domainId: string) {
    this.logger.debug('delete domain on oidc integration. (oidcIntegrationId=%s)', domainId);

    const query = psql`
      DELETE
      FROM
        "oidc_integration_domains"
      WHERE
        "id" = ${domainId}
    `;

    await this.pool.query(query);
  }

  async findDomainById(domainId: string) {
    const query = psql`
      SELECT
        ${oidcIntegrationDomainsFields}
      FROM
        "oidc_integration_domains"
      WHERE
        "id" = ${domainId}
    `;

    return this.pool.maybeOne(query).then(OIDCIntegrationDomainModel.nullable().parse);
  }

  async findVerifiedDomainByName(domainName: string) {
    const query = psql`
      SELECT
        ${oidcIntegrationDomainsFields}
      FROM
        "oidc_integration_domains"
      WHERE
        "domain_name" = ${domainName.toLowerCase()}
        AND "verified_at" IS NOT NULL
    `;

    return this.pool.maybeOne(query).then(OIDCIntegrationDomainModel.nullable().parse);
  }

  async findVerifiedDomainByOIDCIntegrationIdAndDomainName(
    oidcIntegrationId: string,
    domainName: string,
  ) {
    const query = psql`
      SELECT
        ${oidcIntegrationDomainsFields}
      FROM
        "oidc_integration_domains"
      WHERE
        "oidc_integration_id" = ${oidcIntegrationId}
        AND "domain_name" = ${domainName.toLowerCase()}
        AND "verified_at" IS NOT NULL
    `;

    return this.pool.maybeOne(query).then(ValidatedOIDCIntegrationDomainModel.nullable().parse);
  }

  async updateDomainVerifiedAt(domainId: string) {
    this.logger.debug(
      'set verified at date for domain on oidc integration. (oidcIntegrationId=%s)',
      domainId,
    );

    // The NOT EXISTS statement is to avoid verifying the domain twice for two different otganizations
    // only one org can own a domain
    const query = psql`
      UPDATE
        "oidc_integration_domains"
      SET
        "verified_at" = NOW()
      WHERE
        "id" = ${domainId}
      AND NOT EXISTS (
        SELECT 1
        FROM "oidc_integration_domains" "x"
        WHERE "x"."domain_name" = "oidc_integration_domains".domain_name
        AND "x"."verified_at" IS NOT NULL
      )
      RETURNING
        ${oidcIntegrationDomainsFields}
    `;

    return this.pool.maybeOne(query).then(OIDCIntegrationDomainModel.nullable().parse);
  }

  async createDomainChallenge(domainId: string) {
    this.logger.debug('create domain challenge (domainId=%s)', domainId);
    const challenge = createChallengePayload();
    const key = `hive:oidcDomainChallenge:${domainId}`;
    const oneDaySeconds = 60 * 60 * 24;
    await this.redis.set(key, JSON.stringify(challenge), 'EX', oneDaySeconds);
    return challenge;
  }

  async deleteDomainChallenge(domainId: string) {
    this.logger.debug('delete domain challenge (domainId=%s)', domainId);
    const key = `hive:oidcDomainChallenge:${domainId}`;
    await this.redis.del(key);
  }

  async getDomainChallenge(domainId: string) {
    this.logger.debug('load domain challenge (domainId=%s)', domainId);
    const key = `hive:oidcDomainChallenge:${domainId}`;
    const rawChallenge = await this.redis.get(key);
    if (rawChallenge === null) {
      this.logger.debug('no domain challenge found (domainId=%s)', domainId);
      return null;
    }

    try {
      return ChallengePayloadModel.parse(JSON.parse(rawChallenge));
    } catch (err) {
      this.logger.error(
        'domain challange is invalid JSON (domainId=%s, err=%s)',
        domainId,
        String(err),
      );
      throw err;
    }
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
