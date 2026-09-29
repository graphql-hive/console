import { TargetAccessScope } from '@/gql/graphql';

export interface Scope<T> {
  name: string;
  description: string;
  mapping: {
    'read-only'?: T;
    'read-write': T;
  };
}

export const NoAccess = 'no-access';

export const RegistryAccessScope = {
  name: 'Registry',
  description: 'Manage registry (publish schemas, run checks, report usage)',
  mapping: {
    'read-only': TargetAccessScope.RegistryRead,
    'read-write': TargetAccessScope.RegistryWrite,
  },
};
