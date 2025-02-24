import type { FastifyReply, FastifyRequest } from '@hive/service-common';
import { captureException } from '@sentry/node';
import type { User } from '../../../shared/entities';
import { AccessError, HiveError } from '../../../shared/errors';
import { isUUID } from '../../../shared/is-uuid';
import {
  OrganizationMembers,
  OrganizationMembershipRoleAssignment,
  ResourceAssignment,
} from '../../organization/providers/organization-members';
import { Logger } from '../../shared/providers/logger';
import type { Storage } from '../../shared/providers/storage';
import type { AuthInstance } from '../providers/auth-instance';
import { AuthNStrategy, AuthorizationPolicyStatement, Session } from './authz';

export class BetterAuthCookieBasedSession extends Session {
  public betterAuthUserId: string;
  private organizationMembers: OrganizationMembers;
  private storage: Storage;

  constructor(
    args: { betterAuthUserId: string; email: string },
    deps: { organizationMembers: OrganizationMembers; storage: Storage; logger: Logger },
  ) {
    super({ logger: deps.logger });
    this.betterAuthUserId = args.betterAuthUserId;
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

    this.logger.debug(
      'Translate organization role assignments to policy statements. (userId=%s, organizationId=%s)',
      user.id,
      organizationId,
    );

    const policyStatements = this.translateAssignedRolesToAuthorizationPolicyStatements(
      organizationId,
      organizationMembership.assignedRole,
    );

    return policyStatements;
  }

  public async getViewer(): Promise<User> {
    const user = await this.storage.getUserBySuperTokenId({
      // KAMIL: change it to betterAuthUserId
      superTokensUserId: this.betterAuthUserId,
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
      return `hrn:${organizationId}:target/${resource.targetId}`;
    }

    if (resource.type === 'service') {
      return `hrn:${organizationId}:target/${resource.targetId}/service/${resource.serviceName}`;
    }

    if (resource.type === 'appDeployment') {
      return `hrn:${organizationId}:target/${resource.targetId}/appDeployment/${resource.appDeploymentName}`;
    }

    casesExhausted(resource);
  }

  private translateAssignedRolesToAuthorizationPolicyStatements(
    organizationId: string,
    assignedRole: OrganizationMembershipRoleAssignment,
  ): Array<AuthorizationPolicyStatement> {
    const policyStatements: Array<AuthorizationPolicyStatement> = [];

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
        resource: this.toResourceIdentifier(organizationId, assignedRole.resolvedResources.project),
      });
    }

    if (assignedRole.role.permissions.target.size) {
      policyStatements.push({
        action: Array.from(assignedRole.role.permissions.target),
        effect: 'allow',
        resource: this.toResourceIdentifier(organizationId, assignedRole.resolvedResources.target),
      });
    }

    if (assignedRole.role.permissions.service.size) {
      policyStatements.push({
        action: Array.from(assignedRole.role.permissions.service),
        effect: 'allow',
        resource: this.toResourceIdentifier(organizationId, assignedRole.resolvedResources.service),
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

    return policyStatements;
  }
}

export class BetterAuthUserAuthNStrategy extends AuthNStrategy<BetterAuthCookieBasedSession> {
  private logger: Logger;
  private organizationMembers: OrganizationMembers;
  private storage: Storage;
  private auth: AuthInstance;

  constructor(deps: {
    logger: Logger;
    storage: Storage;
    organizationMembers: OrganizationMembers;
    auth: AuthInstance;
  }) {
    super();
    this.logger = deps.logger.child({ module: 'BetterAuthUserAuthNStrategy' });
    this.organizationMembers = deps.organizationMembers;
    this.storage = deps.storage;
    this.auth = deps.auth;
  }

  private async verifyBetterAuthSession(args: { req: FastifyRequest; reply: FastifyReply }) {
    this.logger.debug('Attempt verifying BetterAuth session');

    const headers = new Headers();

    for (const [key, value] of Object.entries(args.req.headers)) {
      if (!value) {
        continue;
      }

      const headerValue = Array.isArray(value) ? value[value.length - 1] : value;
      headers.set(key, headerValue);
    }

    let session: Awaited<ReturnType<typeof this.auth.api.getSession>>;

    try {
      session = await this.auth.api.getSession({
        headers,
      });
      this.logger.debug('Session resolution ended successfully');
    } catch (error) {
      this.logger.debug('Session resolution failed');
      this.logger.error('Error while resolving user');
      console.log(error);
      captureException(error);

      throw error;
    }

    if (!session) {
      this.logger.debug('No session found');
      return null;
    }

    if (
      this.auth.options.emailAndPassword.requireEmailVerification &&
      !session.user.emailVerified
    ) {
      throw new HiveError('Your account is not verified. Please verify your email address.', {
        extensions: {
          code: 'VERIFY_EMAIL',
        },
      });
    }

    if (session.session.expiresAt.getTime() <= Date.now()) {
      throw new HiveError('Invalid session', {
        extensions: {
          code: 'NEEDS_REFRESH',
        },
      });
    }

    const userId = session.user.id;
    const email = session.user.email;

    if (!userId || !email) {
      this.logger.error('Session payload is invalid');
      this.logger.debug('Session payload: %s', JSON.stringify(session.user));
      this.logger.debug('Email or ID is missing in the session payload');
      throw new HiveError(`Invalid access token provided`);
    }

    this.logger.debug('BetterAuth session resolved.');
    return {
      betterAuthUserId: userId,
      email,
    };
  }

  async parse(args: {
    req: FastifyRequest;
    reply: FastifyReply;
  }): Promise<BetterAuthCookieBasedSession | null> {
    const session = await this.verifyBetterAuthSession(args);
    if (!session) {
      return null;
    }

    this.logger.debug('SuperTokens session resolved successfully');

    return new BetterAuthCookieBasedSession(
      {
        betterAuthUserId: session.betterAuthUserId,
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

function casesExhausted(_value: never): never {
  throw new Error('Not all cases were handled.');
}
