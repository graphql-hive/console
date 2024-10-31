import { Injectable, Scope } from 'graphql-modules';
import type { Token } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { diffArrays, pushIfMissing } from '../../../shared/helpers';
import { Session } from '../../auth/lib/authz';
import { OrganizationAccessScope } from '../../auth/providers/organization-access';
import { ProjectAccessScope } from '../../auth/providers/project-access';
import { TargetAccessScope } from '../../auth/providers/target-access';
import { Logger } from '../../shared/providers/logger';
import { Storage, TargetSelector } from '../../shared/providers/storage';
import type { CreateTokenResult } from './token-storage';
import { TokenStorage } from './token-storage';

interface CreateTokenInput extends TargetSelector {
  name: string;
  organizationScopes: readonly OrganizationAccessScope[];
  projectScopes: readonly ProjectAccessScope[];
  targetScopes: readonly TargetAccessScope[];
}

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class TokenManager {
  private logger: Logger;

  constructor(
    private session: Session,
    private tokenStorage: TokenStorage,
    private storage: Storage,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'TokenManager',
    });
  }

  async createToken(input: CreateTokenInput): Promise<CreateTokenResult> {
    await this.session.assertPerformAction({
      action: 'targetAccessToken:create',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        targetId: input.targetId,
      },
    });

    const scopes = [...input.organizationScopes, ...input.projectScopes, ...input.targetScopes];

    const currentUser = await this.session.getViewer();
    const currentMember = await this.storage.getOrganizationMember({
      organizationId: input.organizationId,
      userId: currentUser.id,
    });

    if (!currentMember) {
      throw new HiveError('User is not a member of the organization');
    }

    const newScopes = [...input.organizationScopes, ...input.projectScopes, ...input.targetScopes];

    // See what scopes were removed or added
    const modifiedScopes = diffArrays(currentMember.scopes, newScopes);

    // Check if the current user has rights to set these scopes.
    const currentUserMissingScopes = modifiedScopes.filter(
      scope => !currentMember.scopes.includes(scope),
    );

    if (currentUserMissingScopes.length > 0) {
      this.logger.debug(`Logged user scopes: %o`, currentMember.scopes);
      throw new HiveError(`No access to the scopes: ${currentUserMissingScopes.join(', ')}`);
    }

    pushIfMissing(scopes, TargetAccessScope.READ);
    pushIfMissing(scopes, ProjectAccessScope.READ);
    pushIfMissing(scopes, OrganizationAccessScope.READ);

    return this.tokenStorage.createToken({
      organizationId: input.organizationId,
      projectId: input.projectId,
      targetId: input.targetId,
      name: input.name,
      scopes,
    });
  }

  async deleteTokens(input: {
    tokenIds: readonly string[];
    organizationId: string;
    projectId: string;
    targetId: string;
  }): Promise<readonly string[]> {
    await this.session.assertPerformAction({
      action: 'targetAccessToken:delete',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        targetId: input.targetId,
      },
    });

    return this.tokenStorage.deleteTokens(input);
  }

  async getTokens(selector: TargetSelector): Promise<readonly Token[]> {
    await this.session.assertPerformAction({
      action: 'targetAccessToken:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });
    return this.tokenStorage.getTokens(selector);
  }

  async getCurrentToken(): Promise<Token> {
    const token = this.session.getLegacySelector();
    return this.tokenStorage.getToken({ token: token.token });
  }
}
