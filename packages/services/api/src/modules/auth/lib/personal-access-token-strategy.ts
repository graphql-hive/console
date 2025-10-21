import * as crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from '@hive/service-common';
import * as PersonalAccessKey from '../../organization/lib/personal-access-key';
import {
  CachedPersonalAccessToken,
  PersonalAccessTokensCache,
} from '../../organization/providers/personal-access-tokens-cache';
import { Logger } from '../../shared/providers/logger';
import { AccessTokenValidationCache } from '../providers/access-token-validation-cache';
import { AuthNStrategy, Session, type AuthorizationPolicyStatement } from './authz';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class PersonalAccessTokenSession extends Session {
  constructor(
    protected logger: Logger,
    private personalAccessToken: CachedPersonalAccessToken,
  ) {
    super({ logger });
  }

  get id() {
    return this.personalAccessToken.id;
  }

  loadPolicyStatementsForOrganization(_orgId: string): Array<AuthorizationPolicyStatement> {
    return this.personalAccessToken.authorizationPolicyStatements;
  }

  async getActor() {
    return {
      type: 'personalAccessToken' as const,
      personalAccessToken: this.personalAccessToken,
    };
  }
}

export class PersonalAccessTokenSessionStrategy extends AuthNStrategy<PersonalAccessTokenSession> {
  private logger: Logger;

  constructor(
    logger: Logger,
    private personalAccessTokensCache: PersonalAccessTokensCache,
    private accessTokenValidationCache: AccessTokenValidationCache,
  ) {
    super();
    this.logger = logger.child({ module: 'PersonalAccessTokenSessionStrategy' });
  }

  async parse(args: {
    req: FastifyRequest;
    reply: FastifyReply;
  }): Promise<PersonalAccessTokenSession | null> {
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
    const result = PersonalAccessKey.decode(accessToken);
    if (result.type === 'error') {
      this.logger.debug(result.reason);
      return null;
    }

    const personalAccessToken = await this.personalAccessTokensCache.get(
      result.accessKey.id,
      this.logger,
    );

    if (!personalAccessToken) {
      return null;
    }

    // let's hash it so we do not store the plain private key in memory
    const key = hashToken(accessToken);
    const isHashMatch = await this.accessTokenValidationCache.getOrSetForever({
      factory: () =>
        PersonalAccessKey.verify(result.accessKey.privateKey, personalAccessToken.hash),
      key,
    });

    if (!isHashMatch) {
      this.logger.debug('Provided private key does not match hash.');
      return null;
    }

    return new PersonalAccessTokenSession(args.req.log, personalAccessToken);
  }
}
