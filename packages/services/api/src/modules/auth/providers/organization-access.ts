import DataLoader from 'dataloader';
import { forwardRef, Inject, Injectable, Scope } from 'graphql-modules';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
import { TokenStorage } from '../../token/providers/token-storage';
import { OrganizationAccessScope } from './scopes';

export { OrganizationAccessScope } from './scopes';



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


  constructor(
    logger: Logger,
    private storage: Storage,
    @Inject(forwardRef(() => TokenStorage)) private tokenStorage: TokenStorage,
  ) {
    this.logger = logger.child({
      source: 'OrganizationAccess',
    });

  }


}
