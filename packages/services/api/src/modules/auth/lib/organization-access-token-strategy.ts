import { type FastifyReply, type FastifyRequest } from '@hive/service-common';
import * as OrganizationAccessKey from '../../organization/lib/organization-access-key';
import { OrganizationAccessTokensCache } from '../../organization/providers/organization-access-tokens-cache';
import { Logger } from '../../shared/providers/logger';
import { AuthNStrategy, AuthorizationPolicyStatement, Session } from './authz';

export class OrganizationAccessTokenSession extends Session {
  public readonly organizationId: string;
  private policies: Array<AuthorizationPolicyStatement>;

  constructor(
    args: {
      organizationId: string;
      policies: Array<AuthorizationPolicyStatement>;
    },
    deps: {
      logger: Logger;
    },
  ) {
    super({ logger: deps.logger });
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

  private cache: OrganizationAccessTokensCache;

  constructor(deps: { logger: Logger; cache: OrganizationAccessTokensCache }) {
    super();
    this.logger = deps.logger.child({ module: 'OrganizationAccessTokenStrategy' });
    this.cache = deps.cache;
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

    const organizationAccessToken = await this.cache.get(result.accessKey.id);
    if (!organizationAccessToken) {
      return null;
    }

    // TODO: we should probably cache this verification
    const isHashMatch = await OrganizationAccessKey.verify(
      result.accessKey.privateKey,
      organizationAccessToken.hash,
    );

    if (!isHashMatch) {
      this.logger.debug('Provided private key does not match hash.');
      return null;
    }

    return new OrganizationAccessTokenSession(
      {
        organizationId: organizationAccessToken.organizationId,
        policies: organizationAccessToken.authorizationPolicyStatements,
      },
      {
        logger: args.req.log,
      },
    );
  }
}
