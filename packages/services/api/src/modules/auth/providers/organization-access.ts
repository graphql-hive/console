import DataLoader from 'dataloader';
import { forwardRef, Inject, Injectable, Scope } from 'graphql-modules';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import { TokenStorage } from '../../token/providers/token-storage';
import { OrganizationAccessScope } from './scopes';

export { OrganizationAccessScope } from './scopes';

export interface OrganizationOwnershipSelector {
  userId: string;
  organizationId: string;
}

export interface OrganizationUserScopesSelector {
  userId: string;
  organizationId: string;
}

export interface OrganizationUserAccessSelector {
  userId: string;
  organizationId: string;
  scope: OrganizationAccessScope;
}

@Injectable({
  scope: Scope.Operation,
})
export class OrganizationAccess {
  private logger: Logger;
  ownership: DataLoader<
    {
      organizationId: string;
    },
    string | null,
    string
  >;

  constructor(
    logger: Logger,
    private storage: Storage,
    @Inject(forwardRef(() => TokenStorage)) private tokenStorage: TokenStorage,
  ) {
    this.logger = logger.child({
      source: 'OrganizationAccess',
    });
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

  async checkOwnershipForUser(selector: OrganizationOwnershipSelector) {
    const owner = await this.ownership.load(selector);

    if (!owner) {
      return false;
    }

    return owner === selector.userId;
  }
}
