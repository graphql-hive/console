import * as crypto from 'node:crypto';
import { type FastifyReply, type FastifyRequest } from '@hive/service-common';
import * as OrganizationAccessKey from '../../organization/lib/organization-access-key';
import { OrganizationAccessTokensCache } from '../../organization/providers/organization-access-tokens-cache';
import { Logger } from '../../shared/providers/logger';
import { OrganizationAccessTokenValidationCache } from '../providers/organization-access-token-validation-cache';
import { AuthNStrategy, AuthorizationPolicyStatement, Session } from './authz';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class OrganizationAccessTokenSession extends Session {
  public readonly organizationId: string;
  private policies: Array<AuthorizationPolicyStatement>;
  readonly id: string;

  constructor(
    args: {
      id: string;
      organizationId: string;
      policies: Array<AuthorizationPolicyStatement>;
    },
    deps: {
      logger: Logger;
    },
  ) {
    super({ logger: deps.logger });
    this.id = args.id;
    this.organizationId = args.organizationId;
    this.policies = args.policies;
  }

  protected loadPolicyStatementsForOrganization(
    _: string,
  ): Promise<Array<AuthorizationPolicyStatement>> | Array<AuthorizationPolicyStatement> {
    return this.policies;
  }
}

export class OrganizationAccessTokenStrategy extends AuthNStrategy<OrganizationAccessTokenSession> {
  private logger: Logger;

  private organizationAccessTokenCache: OrganizationAccessTokensCache;
  private organizationAccessTokenValidationCache: OrganizationAccessTokenValidationCache;

  constructor(deps: {
    logger: Logger;
    organizationAccessTokensCache: OrganizationAccessTokensCache;
    organizationAccessTokenValidationCache: OrganizationAccessTokenValidationCache;
  }) {
    super();
    this.logger = deps.logger.child({ module: 'OrganizationAccessTokenStrategy' });
    this.organizationAccessTokenCache = deps.organizationAccessTokensCache;
    this.organizationAccessTokenValidationCache = deps.organizationAccessTokenValidationCache;
  }

  async parse(args: {
    req: FastifyRequest;
    reply: FastifyReply;
  }): Promise<OrganizationAccessTokenSession | null> {
    this.logger.debug('Attempt to resolve an API token from headers');
    let value: string | null = null;
    for (const headerName in args.req.headers) {
      if (headerName.toLowerCase() !== 'authorization') {
        continue;
      }
      const values = args.req.headers[headerName];
      value = (Array.isArray(values) ? values.at(0) : values) ?? null;
    }

    if (!value) {
      this.logger.debug('No access token header found.');
      return null;
    }

    if (!value.startsWith('Bearer ')) {
      this.logger.debug('Access token does not start with "Bearer ".');
      return null;
    }

    const accessToken = value.replace('Bearer ', '');
    const result = OrganizationAccessKey.decode(accessToken);
    if (result.type === 'error') {
      this.logger.debug(result.reason);
      return null;
    }

    const organizationAccessToken = await this.organizationAccessTokenCache.get(
      result.accessKey.id,
      this.logger,
    );
    if (!organizationAccessToken) {
      return null;
    }

    // let's hash it so we do not store the plain private key in memory
    const key = hashToken(accessToken);
    const isHashMatch = await this.organizationAccessTokenValidationCache.getOrSetForever({
      factory: () =>
        OrganizationAccessKey.verify(result.accessKey.privateKey, organizationAccessToken.hash),
      key,
    });

    if (!isHashMatch) {
      this.logger.debug('Provided private key does not match hash.');
      return null;
    }

    return new OrganizationAccessTokenSession(
      {
        id: organizationAccessToken.id,
        organizationId: organizationAccessToken.organizationId,
        policies: organizationAccessToken.authorizationPolicyStatements,
      },
      {
        logger: args.req.log,
      },
    );
  }
}
