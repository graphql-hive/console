import { Injectable, Scope } from 'graphql-modules';
import type { User } from '../../../shared/entities';
import { AccessError } from '../../../shared/errors';
import { Storage } from '../../shared/providers/storage';
import { Session } from '../lib/authz';
import { TargetAccessTokenSession } from '../lib/target-access-token-strategy';
import {
  OrganizationAccess,
  OrganizationAccessScope,
  OrganizationUserScopesSelector,
} from './organization-access';
import { ProjectAccess, ProjectAccessScope, ProjectUserScopesSelector } from './project-access';
import { TargetAccess, TargetAccessScope, TargetUserScopesSelector } from './target-access';
import { UserManager } from './user-manager';

export interface OrganizationAccessSelector {
  organizationId: string;
  scope: OrganizationAccessScope;
}

export interface ProjectAccessSelector {
  organizationId: string;
  projectId: string;
  scope: ProjectAccessScope;
}

export interface TargetAccessSelector {
  organizationId: string;
  projectId: string;
  targetId: string;
  scope: TargetAccessScope;
}

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class AuthManager {
  constructor(
    private organizationAccess: OrganizationAccess,
    private projectAccess: ProjectAccess,
    private targetAccess: TargetAccess,
    private userManager: UserManager,
    private session: Session,
  ) {}

  async ensureOrganizationAccess(selector: OrganizationAccessSelector): Promise<void | never> {
    if (this.session instanceof TargetAccessTokenSession) {
      await this.organizationAccess.ensureAccessForToken({
        ...selector,
        token: this.session.token,
      });
    } else {
      const user = await this.session.getViewer();

      // If a user is an admin, we can allow access for all data
      if (user.isAdmin) {
        return;
      }

      await this.organizationAccess.ensureAccessForUser({
        ...selector,
        userId: user.id,
      });
    }
  }

  async checkOrganizationAccess(selector: OrganizationAccessSelector): Promise<boolean> {
    if (this.session instanceof TargetAccessTokenSession) {
      throw new Error('checkOrganizationAccess for token is not implemented yet');
    }

    const user = await this.session.getViewer();

    return this.organizationAccess.checkAccessForUser({
      ...selector,
      userId: user.id,
    });
  }

  async ensureOrganizationOwnership(selector: { organization: string }): Promise<void | never> {
    const user = await this.session.getViewer();
    const isOwner = await this.organizationAccess.checkOwnershipForUser({
      organizationId: selector.organization,
      userId: user.id,
    });

    if (!isOwner) {
      throw new AccessError('You are not an owner or organization does not exist');
    }
  }

  async getCurrentUserAccessScopes(organizationId: string) {
    const user = await this.session.getViewer();

    if (!user) {
      throw new AccessError('User not found');
    }

    const [organizationScopes, projectScopes, targetScopes] = await Promise.all([
      this.getMemberOrganizationScopes({
        organizationId: organizationId,
        userId: user.id,
      }),
      this.getMemberProjectScopes({
        organizationId: organizationId,
        userId: user.id,
      }),
      this.getMemberTargetScopes({
        organizationId: organizationId,
        userId: user.id,
      }),
    ]);

    return [...organizationScopes, ...projectScopes, ...targetScopes];
  }

  async updateCurrentUser(input: { displayName: string; fullName: string }): Promise<User> {
    const user = await this.session.getViewer();
    return this.userManager.updateUser({
      id: user.id,
      ...input,
    });
  }

  getMemberOrganizationScopes(selector: OrganizationUserScopesSelector) {
    return this.organizationAccess.getMemberScopes(selector);
  }

  getMemberProjectScopes(selector: ProjectUserScopesSelector) {
    return this.projectAccess.getMemberScopes(selector);
  }

  getMemberTargetScopes(selector: TargetUserScopesSelector) {
    return this.targetAccess.getMemberScopes(selector);
  }

  resetAccessCache() {
    this.organizationAccess.resetAccessCache();
    this.projectAccess.resetAccessCache();
    this.targetAccess.resetAccessCache();
  }
}
