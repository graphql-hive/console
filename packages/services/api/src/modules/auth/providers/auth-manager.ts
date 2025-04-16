import { Injectable, Scope } from 'graphql-modules';
import type { User } from '../../../shared/entities';
import { AccessError } from '../../../shared/errors';
import { Session } from '../lib/authz';
import { OrganizationAccess, OrganizationAccessScope } from './organization-access';
import { ProjectAccessScope, TargetAccessScope } from './scopes';
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
    private userManager: UserManager,
    private session: Session,
  ) {}

  async ensureOrganizationOwnership(selector: { organization: string }): Promise<void | never> {
    const actor = await this.session.getActor();

    if (actor.type !== 'user') {
      throw new AccessError('Action can only be performed by user.');
    }

    const isOwner = await this.organizationAccess.checkOwnershipForUser({
      organizationId: selector.organization,
      userId: actor.user.id,
    });

    if (!isOwner) {
      throw new AccessError('You are not an owner or organization does not exist');
    }
  }

  async updateCurrentUser(input: { displayName: string; fullName: string }): Promise<User> {
    const actor = await this.session.getActor();
    if (actor.type !== 'user') {
      throw new AccessError('Action can only be performed by user.');
    }

    return this.userManager.updateUser({
      id: actor.user.id,
      ...input,
    });
  }
}
