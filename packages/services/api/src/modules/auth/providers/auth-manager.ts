import DataLoader from 'dataloader';
import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { AccessError } from '../../../shared/errors';
import { Storage } from '../../shared/providers/storage';
import { Session } from '../lib/authz';
import { OrganizationAccessScope, ProjectAccessScope, TargetAccessScope } from './scopes';
import { displayNameLengthBoundaries, fullNameLengthBoundaries, UserManager } from './user-manager';

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
  ownership: DataLoader<
    {
      organizationId: string;
    },
    string | null,
    string
  >;

  constructor(
    private userManager: UserManager,
    private session: Session,
    private storage: Storage,
  ) {
    this.ownership = new DataLoader(
      async selectors => {
        const ownerPerSelector = await Promise.all(
          selectors.map(selector => this.storage.getOrganizationOwnerId(selector)),
        );

        return selectors.map((_, i) => ownerPerSelector[i]);
      },
      {
        cacheKeyFn(selector) {
          return JSON.stringify({
            type: 'OrganizationAccess:ownership',
            organization: selector.organizationId,
          });
        },
      },
    );
  }

  async ensureOrganizationOwnership(selector: { organization: string }): Promise<void | never> {
    const actor = await this.session.getActor();

    if (actor.type !== 'user') {
      throw new AccessError('Action can only be performed by user.');
    }

    const isOwner = await this.checkOwnershipForUser({
      organizationId: selector.organization,
      userId: actor.user.id,
    });

    if (!isOwner) {
      throw new AccessError('You are not an owner or organization does not exist');
    }
  }

  private async checkOwnershipForUser(selector: OrganizationOwnershipSelector) {
    const owner = await this.ownership.load(selector);

    if (!owner) {
      return false;
    }

    return owner === selector.userId;
  }

  async updateCurrentUser(input: { displayName: string; fullName: string }) {
    const InputModel = z.object({
      displayName: z
        .string()
        .min(displayNameLengthBoundaries.min)
        .max(displayNameLengthBoundaries.max),
      fullName: z.string().min(fullNameLengthBoundaries.min).max(fullNameLengthBoundaries.max),
    });
    const result = InputModel.safeParse(input);

    if (!result.success) {
      return {
        type: 'error' as const,
        error: {
          message: 'Please check your input.',
          inputErrors: {
            displayName: result.error.formErrors.fieldErrors.displayName?.[0],
            fullName: result.error.formErrors.fieldErrors.fullName?.[0],
          },
        },
      };
    }

    const actor = await this.session.getActor();
    if (actor.type !== 'user') {
      throw new AccessError('Action can only be performed by user.');
    }

    if (actor.user.provisionedByOrganizationId !== null) {
      return {
        type: 'error' as const,
        error: {
          message: 'Provisioned users can not be modified.',
          inputErrors: {},
        },
      };
    }

    return {
      type: 'success' as const,
      user: await this.userManager.updateUser({
        id: actor.user.id,
        ...input,
      }),
    };
  }
}

export interface OrganizationOwnershipSelector {
  userId: string;
  organizationId: string;
}
