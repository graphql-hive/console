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
import { AuthNStrategy, AuthorizationPolicyStatement, Session, UserActor } from './authz';

export class SuperTokensCookieBasedSession extends Session {
  public superTokensUserId: string;
  public userId: string | undefined;
  public oidcIntegrationId: string | null | undefined;
  private organizationMembers: OrganizationMembers;
  private storage: Storage;

  constructor(
    args: {
      superTokensUserId: string;
      userId: string | undefined;
      oidcIntegrationId: string | null | undefined;
      email: string;
    },
    deps: { organizationMembers: OrganizationMembers; storage: Storage; logger: Logger },
  ) {
    super({ logger: deps.logger });
    this.superTokensUserId = args.superTokensUserId;
    this.userId = args.userId;
    this.oidcIntegrationId = args.oidcIntegrationId;
    this.organizationMembers = deps.organizationMembers;
    this.storage = deps.storage;
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
      throw new OIDCRequiredError(oidcIntegration.id);
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
      oidcIntegrationId: this.oidcIntegrationId ?? null,
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
  }

  private async verifySuperTokensSession(args: { req: FastifyRequest; reply: FastifyReply }) {
    this.logger.debug('Attempt verifying SuperTokens session');

    if (args.req.headers['ignore-session']) {
      this.logger.debug('Ignoring session due to header');
      return null;
    }

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

    if (!payload) {
      this.logger.error('No access token payload found');
      return null;
    }

    const result = SuperTokenAccessTokenModel.safeParse(payload);

    if (result.success === false) {
      this.logger.error('SuperTokens session payload is invalid');
      this.logger.debug('SuperTokens session payload: %s', JSON.stringify(payload));
      this.logger.debug(
        'SuperTokens session parsing errors: %s',
        JSON.stringify(result.error.flatten().fieldErrors),
      );
      throw new HiveError(`Invalid access token provided`);
    }

    if (this.emailVerification) {
      // Check whether the email is already verified.
      // If it is not then we need to redirect to the email verification page - which will trigger the email sending.
      const { verified } = await this.emailVerification.checkUserEmailVerified({
        userIdentityId: session.getUserId(),
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
    const session = await this.verifySuperTokensSession(args);
    if (!session) {
      return null;
    }

    this.logger.debug('SuperTokens session resolved successfully');

    return new SuperTokensCookieBasedSession(
      {
        superTokensUserId: session.superTokensUserId,
        userId: session.userId,
        oidcIntegrationId: session.oidcIntegrationId,
        email: session.email,
      },
      {
        storage: this.storage,
        organizationMembers: this.organizationMembers,
        logger: args.req.log,
      },
    );
  }
}

const SuperTokenAccessTokenModel = zod.object({
  version: zod.literal('1'),
  superTokensUserId: zod.string(),
  userId: zod.string().optional(),
  oidcIntegrationId: zod.string().nullable().optional(),
  email: zod.string(),
});
