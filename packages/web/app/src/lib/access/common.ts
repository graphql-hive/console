import React, { useEffect } from 'react';
import { TargetAccessScope } from '@/gql/graphql';
import { useRouter } from '@tanstack/react-router';

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

export function useRedirect({
  canAccess,
  entity,
  redirectTo,
}: {
  canAccess: boolean;
  redirectTo?: (router: ReturnType<typeof useRouter>) => void;
  /** The entity that must be non-null for the redirect to happen. */
  entity?: any;
}) {
  const router = useRouter();
  const redirectRef = React.useRef(false);
  useEffect(() => {
    if (!redirectTo) {
      return;
    }

    if (!canAccess && entity && !redirectRef.current) {
      redirectRef.current = true;
      redirectTo(router);
    }
  }, [router, canAccess, redirectRef, redirectTo]);
}
