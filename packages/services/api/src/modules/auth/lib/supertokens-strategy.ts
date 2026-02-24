import c from 'node:crypto';
import { parse as parseCookie } from 'cookie-es';
import SessionNode from 'supertokens-node/recipe/session/index.js';
import * as zod from 'zod';
import type { FastifyReply, FastifyRequest } from '@hive/service-common';
import { captureException } from '@sentry/node';
import { AccessError, HiveError, OIDCRequiredError } from '../../../shared/errors';
import { isUUID } from '../../../shared/is-uuid';
import { OrganizationMembers } from '../../organization/providers/organization-members';
import { Logger } from '../../shared/providers/logger';
import type { Storage } from '../../shared/providers/storage';
import { EmailVerification } from '../providers/email-verification';
import { SessionInfo, SuperTokensStore } from '../providers/supertokens-store';
import { AuthNStrategy, AuthorizationPolicyStatement, Session, UserActor } from './authz';
import {
  AccessTokenKeyContainer,
  isAccessToken,
  parseAccessToken,
} from './supertokens-at-home/crypto';

function sha256(str: string) {
  return c.createHash('sha256').update(str).digest('hex');
}

export class SuperTokensCookieBasedSession extends Session {
  public superTokensUserId: string;
  private organizationMembers: OrganizationMembers;
  private storage: Storage;
  /**
   * The properties `userId` and `oidcIntegrationId` are nullable for backwards compatibility.
   * In the future, when all still active sessions are using the new format, we can remove the nullability.
   */
  public userId: string | null = null;
  public oidcIntegrationId: string | null = null;

  constructor(
    sessionPayload: SuperTokensSessionPayload,
    deps: { organizationMembers: OrganizationMembers; storage: Storage; logger: Logger },
  ) {
    super({ logger: deps.logger });
    this.superTokensUserId = sessionPayload.superTokensUserId;

    this.organizationMembers = deps.organizationMembers;
    this.storage = deps.storage;

    if (sessionPayload.version === '2') {
      this.userId = sessionPayload.userId;
      this.oidcIntegrationId = sessionPayload.oidcIntegrationId;
    }
  }

  get id(): string {
    return this.superTokensUserId;
  }

  protected async loadPolicyStatementsForOrganization(
    organizationId: string,
  ): Promise<Array<AuthorizationPolicyStatement>> {
    const { user } = await this.getActor();

    this.logger.debug(
      'Loading policy statements for organization. (userId=%s, organizationId=%s)',
      user.id,
      organizationId,
    );

    if (!isUUID(organizationId)) {
      this.logger.debug(
        'Invalid organization ID provided. (userId=%s, organizationId=%s)',
        user.id,
        organizationId,
      );

      return [];
    }

    this.logger.debug(
      'Load organization membership for user. (userId=%s, organizationId=%s)',
      user.id,
      organizationId,
    );
    const [organization, oidcIntegration] = await Promise.all([
      this.storage.getOrganization({ organizationId }),
      this.storage.getOIDCIntegrationForOrganization({
        organizationId,
      }),
    ]);
    const organizationMembership = await this.organizationMembers.findOrganizationMembership({
      organization,
      userId: user.id,
    });

    if (!organizationMembership) {
      this.logger.debug(
        'No membership found, resolve empty policy statements. (userId=%s, organizationId=%s)',
        user.id,
        organizationId,
      );

      // Allow admins to use all describe actions within foreign organizations
      // This makes it much more pleasant to debug.
      if (user.isAdmin) {
        return [
          {
            action: '*:describe',
            effect: 'allow',
            resource: `hrn:${organizationId}:organization/${organizationId}`,
          },
        ];
      }

      return [];
    }

    // owner of organization should have full right to do anything.
    if (organizationMembership.isOwner) {
      this.logger.debug(
        'User is organization owner, resolve admin access policy. (userId=%s, organizationId=%s)',
        user.id,
        organizationId,
      );

      return [
        {
          action: '*',
          effect: 'allow',
          resource: `hrn:${organizationId}:organization/${organizationId}`,
        },
      ];
    }

    if (oidcIntegration?.oidcUserAccessOnly && this.oidcIntegrationId !== oidcIntegration.id) {
      throw new OIDCRequiredError(organization.slug, oidcIntegration.id);
    }

    this.logger.debug(
      'Translate organization role assignments to policy statements. (userId=%s, organizationId=%s)',
      user.id,
      organizationId,
    );

    return organizationMembership.assignedRole.authorizationPolicyStatements;
  }

  public async getActor(): Promise<UserActor> {
    const user = this.userId
      ? await this.storage.getUserById({ id: this.userId })
      : await this.storage.getUserBySuperTokenId({ superTokensUserId: this.superTokensUserId });

    if (!user) {
      throw new AccessError('User not found');
    }

    return {
      type: 'user',
      user,
      oidcIntegrationId: this.oidcIntegrationId,
    };
  }

  public isViewer() {
    return true;
  }
}

export class SuperTokensUserAuthNStrategy extends AuthNStrategy<SuperTokensCookieBasedSession> {
  private logger: Logger;
  private organizationMembers: OrganizationMembers;
  private storage: Storage;
  private supertokensStore: SuperTokensStore;
  private emailVerification: EmailVerification | null;
  private accessTokenKey: AccessTokenKeyContainer | null;

  constructor(deps: {
    logger: Logger;
    storage: Storage;
    organizationMembers: OrganizationMembers;
    emailVerification: EmailVerification | null;
    accessTokenKey: AccessTokenKeyContainer | null;
  }) {
    super();
    this.logger = deps.logger.child({ module: 'SuperTokensUserAuthNStrategy' });
    this.organizationMembers = deps.organizationMembers;
    this.storage = deps.storage;
    this.emailVerification = deps.emailVerification;
    this.supertokensStore = new SuperTokensStore(deps.storage.pool, deps.logger);
    this.accessTokenKey = deps.accessTokenKey;
  }

  private async _verifySuperTokensCoreSession(args: { req: FastifyRequest; reply: FastifyReply }) {
    let session: SessionNode.SessionContainer | undefined;

    try {
      session = await SessionNode.getSession(args.req, args.reply, {
        sessionRequired: false,
        antiCsrfCheck: false,
        checkDatabase: true,
      });
      this.logger.debug('Session resolution ended successfully');
    } catch (error) {
      this.logger.debug('Session resolution failed');
      if (SessionNode.Error.isErrorFromSuperTokens(error)) {
        if (
          error.type === SessionNode.Error.TRY_REFRESH_TOKEN ||
          error.type === SessionNode.Error.UNAUTHORISED
        ) {
          throw new HiveError('Invalid session', {
            extensions: {
              code: 'NEEDS_REFRESH',
            },
          });
        }
      }

      this.logger.error('Error while resolving user');
      console.log(error);
      captureException(error);

      throw error;
    }

    if (!session) {
      this.logger.debug('No session found');
      return null;
    }

    const payload = session.getAccessTokenPayload();

    const result = SuperTokensSessionPayloadModel.safeParse(payload);

    if (result.success === false) {
      this.logger.error('SuperTokens session payload is invalid');
      this.logger.debug('SuperTokens session payload: %s', JSON.stringify(payload));
      this.logger.debug(
        'SuperTokens session parsing errors: %s',
        JSON.stringify(result.error.flatten().fieldErrors),
      );
      throw new HiveError('Invalid access token provided', {
        extensions: {
          code: 'UNAUTHENTICATED',
        },
      });
    }

    return result.data;
  }

  private async _verifySuperTokensAtHomeSession(
    args: {
      req: FastifyRequest;
      reply: FastifyReply;
    },
    accessTokenKey: AccessTokenKeyContainer,
  ) {
    let session: SessionInfo | null = null;

    args.req.log.debug('attempt parsing access token from cookie');

    const cookie = parseCookie(args.req.headers.cookie ?? '');
    let rawAccessToken: string | undefined = cookie['sAccessToken'];

    if (!rawAccessToken) {
      args.req.log.debug('attempt parsing access token authorization header');
      rawAccessToken = args.req.headers.authorization?.replace('Bearer ', '')?.trim();
    }

    if (!rawAccessToken || !isAccessToken(rawAccessToken)) {
      args.req.log.debug('access token is not identified as a supertokens access token.');
      return null;
    }

    let accessToken;
    try {
      accessToken = parseAccessToken(rawAccessToken, accessTokenKey.publicKey);
    } catch (err) {
      args.req.log.debug('Failed verifying the access token. Ask for refresh.');
      throw new HiveError('Invalid session', {
        extensions: {
          code: 'NEEDS_REFRESH',
        },
      });
    }

    if (accessToken.exp < Date.now() / 1000) {
      args.req.log.debug('The access token is expired. Ask for refresh.');
      throw new HiveError('Invalid session', {
        extensions: {
          code: 'NEEDS_REFRESH',
        },
      });
    }

    session = await this.supertokensStore.getSessionInfo(accessToken.sessionHandle);

    if (!session) {
      args.req.log.debug('The access token is expired, no session was found. Ask for refresh.');
      return null;
    }

    if (session.expiresAt < Date.now()) {
      args.req.log.debug('The session is expired.');
      throw new HiveError('Invalid session.', {
        extensions: {
          code: 'UNAUTHENTICATED',
        },
      });
    }

    if (
      accessToken.parentRefreshTokenHash1 &&
      sha256(accessToken.parentRefreshTokenHash1) !== session.refreshTokenHash2
    ) {
      args.req.log.debug(
        'The access token is expired. A new access token has been issued for this session. Require refresh.',
      );

      // old access token in use, there was alreadya refresh
      throw new HiveError('Invalid session.', {
        extensions: {
          code: 'NEEDS_REFRESH',
        },
      });
    }

    const result = SuperTokensSessionPayloadModel.safeParse(JSON.parse(session.sessionData));

    if (result.success === false) {
      this.logger.error('SuperTokens session payload is invalid');
      this.logger.debug('SuperTokens session payload: %s', session.sessionData);
      this.logger.debug(
        'SuperTokens session parsing errors: %s',
        JSON.stringify(result.error.flatten().fieldErrors),
      );
      throw new HiveError('Invalid access token provided', {
        extensions: {
          code: 'UNAUTHENTICATED',
        },
      });
    }

    return result.data;
  }

  private async verifySuperTokensSession(args: {
    req: FastifyRequest;
    reply: FastifyReply;
  }): Promise<SuperTokensSessionPayload | null> {
    this.logger.debug('Attempt verifying SuperTokens session');

    if (args.req.headers['ignore-session']) {
      this.logger.debug('Ignoring session due to header');
      return null;
    }

    const sessionData = this.accessTokenKey
      ? await this._verifySuperTokensAtHomeSession(args, this.accessTokenKey)
      : await this._verifySuperTokensCoreSession(args);

    if (!sessionData) {
      this.logger.debug('No session found');
      return null;
    }

    if (this.emailVerification) {
      // Check whether the email is already verified.
      // If it is not then we need to redirect to the email verification page - which will trigger the email sending.
      const { verified } = await this.emailVerification.checkUserEmailVerified({
        userIdentityId: sessionData.superTokensUserId,
        email: sessionData.email,
      });

      if (!verified) {
        throw new HiveError('Your account is not verified. Please verify your email address.', {
          extensions: {
            code: 'VERIFY_EMAIL',
          },
        });
      }
    }

    this.logger.debug('SuperTokens session resolved.');
    return sessionData;
  }

  async parse(args: {
    req: FastifyRequest;
    reply: FastifyReply;
  }): Promise<SuperTokensCookieBasedSession | null> {
    const sessionPayload = await this.verifySuperTokensSession(args);
    if (!sessionPayload) {
      return null;
    }

    this.logger.debug('SuperTokens session resolved successfully');

    return new SuperTokensCookieBasedSession(sessionPayload, {
      storage: this.storage,
      organizationMembers: this.organizationMembers,
      logger: args.req.log,
    });
  }
}

/**
 * This is the legacy format that is no longer issued for new logins.
 * In the future, when all sessions using this access token payload format are expired
 * we can remove it from here.
 */
const SuperTokensSessionPayloadV1Model = zod.object({
  version: zod.literal('1'),
  superTokensUserId: zod.string(),
  email: zod.string(),
});

const SuperTokensSessionPayloadV2Model = zod.object({
  version: zod.literal('2'),
  superTokensUserId: zod.string(),
  email: zod.string(),
  userId: zod.string(),
  oidcIntegrationId: zod.string().nullable(),
});

const SuperTokensSessionPayloadModel = zod.union([
  SuperTokensSessionPayloadV1Model,
  SuperTokensSessionPayloadV2Model,
]);

type SuperTokensSessionPayload = zod.TypeOf<typeof SuperTokensSessionPayloadModel>;
