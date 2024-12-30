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
  OrganizationMembers,
  OrganizationMembershipRoleAssignment,
  ResourceAssignment,
} from '../providers/organization-members';
import { AuthNStrategy, AuthorizationPolicyStatement, Session } from './authz';

export class SuperTokensCookieBasedSession extends Session {
  public superTokensUserId: string;
  private organizationMembers: OrganizationMembers;
  private storage: Storage;

  constructor(
    args: { superTokensUserId: string; email: string },
    deps: { organizationMembers: OrganizationMembers; storage: Storage; logger: Logger },
  ) {
    super({ logger: deps.logger });
    this.superTokensUserId = args.superTokensUserId;
    this.organizationMembers = deps.organizationMembers;
    this.storage = deps.storage;
  }

  protected async loadPolicyStatementsForOrganization(
    organizationId: string,
  ): Promise<Array<AuthorizationPolicyStatement>> {
    const user = await this.getViewer();

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
    const organization = await this.storage.getOrganization({ organizationId });
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

      return [];
    }

    // owner of organization should have full right to do anything.
    if (organizationMembership?.isAdmin) {
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

    this.logger.debug(
      'Translate organization role assignments to policy statements. (userId=%s, organizationId=%s)',
      user.id,
      organizationId,
    );

    const policyStatements = this.translateAssignedRolesToAuthorizationPolicyStatements(
      organizationId,
      organizationMembership.assignedRoles,
    );

    return policyStatements;
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

  private toResourceIdentifier(organizationId: string, resource: ResourceAssignment): string;
  private toResourceIdentifier(
    organizationId: string,
    resource: ResourceAssignment | Array<ResourceAssignment>,
  ): Array<string>;
  private toResourceIdentifier(
    organizationId: string,
    resource: ResourceAssignment | Array<ResourceAssignment>,
  ): string | Array<string> {
    if (Array.isArray(resource)) {
      return resource.map(resource => this.toResourceIdentifier(organizationId, resource));
    }

    if (resource.type === 'organization') {
      return `hrn:${organizationId}:organization/${resource.organizationId}`;
    }

    if (resource.type === 'project') {
      return `hrn:${organizationId}:project/${resource.projectId}`;
    }

    if (resource.type === 'target') {
      return `hrn:${organizationId}:project/${resource.targetId}`;
    }

    if (resource.type === 'service') {
      return `hrn:${organizationId}:target/${resource.targetId}/service/${resource.serviceName}`;
    }

    if (resource.type === 'appDeployment') {
      return `hrn:${organizationId}:target/${resource.targetId}/appDeployment/${resource.appDeploymentName}`;
    }

    throw new Error('never');
  }

  private translateAssignedRolesToAuthorizationPolicyStatements(
    organizationId: string,
    organizationMembershipRoleAssignments: Array<OrganizationMembershipRoleAssignment>,
  ): Array<AuthorizationPolicyStatement> {
    const policyStatements: Array<AuthorizationPolicyStatement> = [];

    for (const assignedRole of organizationMembershipRoleAssignments) {
      if (assignedRole.role.permissions.organization.size) {
        policyStatements.push({
          action: Array.from(assignedRole.role.permissions.organization),
          effect: 'allow',
          resource: this.toResourceIdentifier(
            organizationId,
            assignedRole.resolvedResources.organization,
          ),
        });
      }

      if (assignedRole.role.permissions.project.size) {
        policyStatements.push({
          action: Array.from(assignedRole.role.permissions.project),
          effect: 'allow',
          resource: this.toResourceIdentifier(
            organizationId,
            assignedRole.resolvedResources.project,
          ),
        });
      }

      if (assignedRole.role.permissions.target.size) {
        policyStatements.push({
          action: Array.from(assignedRole.role.permissions.target),
          effect: 'allow',
          resource: this.toResourceIdentifier(
            organizationId,
            assignedRole.resolvedResources.target,
          ),
        });
      }

      if (assignedRole.role.permissions.service.size) {
        policyStatements.push({
          action: Array.from(assignedRole.role.permissions.service),
          effect: 'allow',
          resource: this.toResourceIdentifier(
            organizationId,
            assignedRole.resolvedResources.service,
          ),
        });
      }

      if (assignedRole.role.permissions.appDeployment.size) {
        policyStatements.push({
          action: Array.from(assignedRole.role.permissions.appDeployment),
          effect: 'allow',
          resource: this.toResourceIdentifier(
            organizationId,
            assignedRole.resolvedResources.appDeployment,
          ),
        });
      }
    }

    return policyStatements;
  }
}

export class SuperTokensUserAuthNStrategy extends AuthNStrategy<SuperTokensCookieBasedSession> {
  private logger: ServiceLogger;
  private organizationMembers: OrganizationMembers;
  private storage: Storage;

  constructor(deps: {
    logger: ServiceLogger;
    storage: Storage;
    organizationMembers: OrganizationMembers;
  }) {
    super();
    this.logger = deps.logger.child({ module: 'SuperTokensUserAuthNStrategy' });
    this.organizationMembers = deps.organizationMembers;
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
        organizationMembers: this.organizationMembers,
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
