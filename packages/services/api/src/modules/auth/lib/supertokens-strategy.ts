import c from 'node:crypto';
import { parse as parseCookie } from 'cookie-es';
import JSW from 'jsonwebtoken';
import * as zod from 'zod';
import { z } from 'zod';
import type { FastifyReply, FastifyRequest } from '@hive/service-common';
import { AccessError, HiveError, OIDCRequiredError } from '../../../shared/errors';
import { isUUID } from '../../../shared/is-uuid';
import { OrganizationMembers } from '../../organization/providers/organization-members';
import { Logger } from '../../shared/providers/logger';
import type { Storage } from '../../shared/providers/storage';
import { EmailVerification } from '../providers/email-verification';
import { SessionInfo, SuperTokensStore } from '../providers/supertokens-store';
import { AuthNStrategy, AuthorizationPolicyStatement, Session, UserActor } from './authz';

function sha256(str: string) {
  return c.createHash('sha256').update(str).digest('hex');
}

const key =
  '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';

const publicKey = c
  .createPublicKey({
    key: Buffer.from(key, 'base64'),
    format: 'der',
    type: 'spki',
  })
  .export({
    type: 'spki',
    format: 'pem',
  });

const AccessTokenModel = z.object({
  iat: z.number(),
  exp: z.number(),
  sub: z.string(),
  rsub: z.string(),
  sessionHandle: z.string(),
  refreshTokenHash1: z.string(),
  parentRefreshTokenHash1: z.string().nullable().optional(), // Making this optional as it may not always be present
});

function parseAccessToken(accessToken: string) {
  const token = JSW.verify(accessToken, publicKey, {
    algorithms: ['RS256'],
  });

  return AccessTokenModel.parse(token);
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

  constructor(deps: {
    logger: Logger;
    storage: Storage;
    organizationMembers: OrganizationMembers;
    emailVerification: EmailVerification | null;
  }) {
    super();
    this.logger = deps.logger.child({ module: 'SuperTokensUserAuthNStrategy' });
    this.organizationMembers = deps.organizationMembers;
    this.storage = deps.storage;
    this.emailVerification = deps.emailVerification;
    this.supertokensStore = new SuperTokensStore(deps.storage.pool, deps.logger);
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

    let session: SessionInfo | null = null;

    const cookie = parseCookie(args.req.headers.cookie ?? '');
    const accessTokenCookie: string | undefined = cookie['sAccessToken'];

    if (!accessTokenCookie) {
      return null;
    }

    const accessToken = parseAccessToken(accessTokenCookie);

    if (accessToken.exp < Date.now() / 1000) {
      throw new HiveError('Invalid session', {
        extensions: {
          code: 'NEEDS_REFRESH',
        },
      });
    }

    session = await this.supertokensStore.getSessionInfo(accessToken.sessionHandle);

    if (!session) {
      this.logger.debug('No session found');
      return null;
    }

    if (session.expiresAt < Date.now()) {
      throw new HiveError('Invalid session.', {
        extensions: {
          code: 'NEEDS_REFRESH',
        },
      });
    }

    if (
      accessToken.parentRefreshTokenHash1 &&
      sha256(accessToken.parentRefreshTokenHash1) !== session.refreshTokenHash2
    ) {
      // old access token in use, there was alreadya refresh
      throw new HiveError('Invalid session.', {
        extensions: {
          code: 'NEEDS_REFRESH',
        },
      });
    }

    // TODO: json parse might be dangerous
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

    if (this.emailVerification) {
      // Check whether the email is already verified.
      // If it is not then we need to redirect to the email verification page - which will trigger the email sending.
      const { verified } = await this.emailVerification.checkUserEmailVerified({
        userIdentityId: session.userId,
        email: result.data.email,
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
    return result.data;
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
