import SessionNode from 'supertokens-node/recipe/session/index.js';
import * as zod from 'zod';
import type { FastifyReply, FastifyRequest, ServiceLogger } from '@hive/service-common';
import { captureException } from '@sentry/node';
import type { User } from '../../../shared/entities';
import { AccessError, HiveError } from '../../../shared/errors';
import { isUUID } from '../../../shared/is-uuid';
import { Logger } from '../../shared/providers/logger';
import type { Storage } from '../../shared/providers/storage';
import {
  OrganizationAccessScope,
  ProjectAccessScope,
  TargetAccessScope,
} from '../providers/scopes';
import { AuthNStrategy, AuthorizationPolicyStatement, Session } from './authz';

export class SuperTokensCookieBasedSession extends Session {
  public superTokensUserId: string;
  private storage: Storage;

  constructor(
    args: { superTokensUserId: string; email: string },
    deps: { storage: Storage; logger: Logger },
  ) {
    super({ logger: deps.logger });
    this.superTokensUserId = args.superTokensUserId;
    this.storage = deps.storage;
  }

  protected async loadPolicyStatementsForOrganization(
    organizationId: string,
  ): Promise<Array<AuthorizationPolicyStatement>> {
    const user = await this.getViewer();

    if (!isUUID(organizationId)) {
      return [];
    }

    const member = await this.storage.getOrganizationMember({
      organizationId,
      userId: user.id,
    });

    // owner of organization should have full right to do anything.
    if (member?.isOwner) {
      return [
        {
          action: '*',
          effect: 'allow',
          resource: `hrn:${organizationId}:organization/${organizationId}`,
        },
      ];
    }

    if (Array.isArray(member?.scopes)) {
      return transformOrganizationMemberLegacyScopes({ organizationId, scopes: member.scopes });
    }

    return [];
  }

  public async getViewer(): Promise<User> {
    const user = await this.storage.getUserBySuperTokenId({
      superTokensUserId: this.superTokensUserId,
    });

    if (!user) {
      throw new AccessError('User not found');
    }

    return user;
  }

  public isViewer() {
    return true;
  }
}

export class SuperTokensUserAuthNStrategy extends AuthNStrategy<SuperTokensCookieBasedSession> {
  private logger: ServiceLogger;
  private storage: Storage;

  constructor(deps: { logger: ServiceLogger; storage: Storage }) {
    super();
    this.logger = deps.logger.child({ module: 'SuperTokensUserAuthNStrategy' });
    this.storage = deps.storage;
  }

  private async verifySuperTokensSession(args: { req: FastifyRequest; reply: FastifyReply }) {
    this.logger.debug('Attempt verifying SuperTokens session');
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
        // Check whether the email is already verified.
        // If it is not then we need to redirect to the email verification page - which will trigger the email sending.
        if (error.type === SessionNode.Error.INVALID_CLAIMS) {
          throw new HiveError('Your account is not verified. Please verify your email address.', {
            extensions: {
              code: 'VERIFY_EMAIL',
            },
          });
        } else if (
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
        email: session.email,
      },
      {
        storage: this.storage,
        logger: args.req.log,
      },
    );
  }
}

const SuperTokenAccessTokenModel = zod.object({
  version: zod.literal('1'),
  superTokensUserId: zod.string(),
  email: zod.string(),
});

function transformOrganizationMemberLegacyScopes(args: {
  organizationId: string;
  scopes: Array<OrganizationAccessScope | ProjectAccessScope | TargetAccessScope>;
}) {
  const policies: Array<AuthorizationPolicyStatement> = [];
  for (const scope of args.scopes) {
    switch (scope) {
      case OrganizationAccessScope.READ: {
        policies.push({
          effect: 'allow',
          action: [
            'support:manageTickets',
            'project:create',
            'project:describe',
            'organization:describe',
          ],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case OrganizationAccessScope.SETTINGS: {
        policies.push({
          effect: 'allow',
          action: [
            'organization:modifySlug',
            'schemaLinting:modifyOrganizationRules',
            'billing:describe',
            'billing:update',
          ],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case OrganizationAccessScope.DELETE: {
        policies.push({
          effect: 'allow',
          action: ['organization:delete'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case OrganizationAccessScope.INTEGRATIONS: {
        policies.push({
          effect: 'allow',
          action: ['oidc:modify', 'gitHubIntegration:modify', 'slackIntegration:modify'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case OrganizationAccessScope.MEMBERS: {
        policies.push({
          effect: 'allow',
          action: [
            'member:manageInvites',
            'member:removeMember',
            'member:assignRole',
            'member:modifyRole',
            'member:describe',
          ],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case ProjectAccessScope.ALERTS: {
        policies.push({
          effect: 'allow',
          action: ['alert:modify'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case ProjectAccessScope.READ: {
        policies.push({
          effect: 'allow',
          action: ['project:describe'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case ProjectAccessScope.DELETE: {
        policies.push({
          effect: 'allow',
          action: ['project:delete'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case ProjectAccessScope.SETTINGS: {
        policies.push({
          effect: 'allow',
          action: ['project:delete', 'project:modifySettings', 'schemaLinting:modifyProjectRules'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case TargetAccessScope.READ: {
        policies.push({
          effect: 'allow',
          action: ['appDeployment:describe', 'laboratory:describe', 'target:create'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case TargetAccessScope.REGISTRY_WRITE: {
        policies.push({
          effect: 'allow',
          action: ['schemaCheck:approve', 'schemaVersion:approve', 'laboratory:modify'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case TargetAccessScope.TOKENS_WRITE: {
        policies.push({
          effect: 'allow',
          action: ['targetAccessToken:modify', 'cdnAccessToken:modify'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case TargetAccessScope.SETTINGS: {
        policies.push({
          effect: 'allow',
          action: ['target:modifySettings', 'laboratory:modifyPreflightScript'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
      case TargetAccessScope.DELETE: {
        policies.push({
          effect: 'allow',
          action: ['target:delete'],
          resource: [`hrn:${args.organizationId}:organization/${args.organizationId}`],
        });
        break;
      }
    }
  }

  return policies;
}
