import React from 'react';
import { Router, useRouteSelector } from '@/lib/hooks/use-route-selector';
import { OrganizationAccessScope, ProjectAccessScope, TargetAccessScope } from '../../graphql';

export interface Scope<T> {
  name: string;
  description: string;
  mapping: {
    'read-only'?: T;
    'read-write': T;
  };
}

export const NoAccess = 'no-access';

export const scopes: {
  organization: readonly Scope<OrganizationAccessScope>[];
  project: readonly Scope<ProjectAccessScope>[];
  target: readonly Scope<TargetAccessScope>[];
} = {
  organization: [
    {
      name: 'Delete',
      description: 'The member will be able to delete an organization',
      mapping: {
        'read-write': OrganizationAccessScope.Delete,
      },
    },
    {
      name: 'Settings',
      description: `Manage organization's settings (change its name, etc.)`,
      mapping: {
        'read-write': OrganizationAccessScope.Settings,
      },
    },
    {
      name: 'Integrations',
      description: `Manage 3rd party integrations (Slack, GitHub, etc.)`,
      mapping: {
        'read-write': OrganizationAccessScope.Integrations,
      },
    },
    {
      name: 'Members',
      description: 'Manage organization members (invite, remove, etc.)',
      mapping: {
        'read-write': OrganizationAccessScope.Members,
      },
    },
  ],
  project: [
    {
      name: 'Delete',
      description: 'The member will be able to delete a project',
      mapping: {
        'read-write': ProjectAccessScope.Delete,
      },
    },
    {
      name: 'Settings',
      description: `Manage organization's settings (change its name, etc.)`,
      mapping: {
        'read-write': ProjectAccessScope.Settings,
      },
    },
    {
      name: 'Alerts',
      description: 'Manage 3rd party integrations (Slack, GitHub, etc.)',
      mapping: {
        'read-write': ProjectAccessScope.Alerts,
      },
    },
    {
      name: 'Operations Store',
      description: 'Manage persisted operations',
      mapping: {
        'read-only': ProjectAccessScope.OperationsStoreRead,
        'read-write': ProjectAccessScope.OperationsStoreWrite,
      },
    },
  ],
  target: [
    {
      name: 'Delete',
      description: 'The member will be able to delete a target',
      mapping: {
        'read-write': TargetAccessScope.Delete,
      },
    },
    {
      name: 'Registry',
      description: 'Manage schema registry (publish new schemas, run schema checks, report usage, etc.)',
      mapping: {
        'read-only': TargetAccessScope.RegistryRead,
        'read-write': TargetAccessScope.RegistryWrite,
      },
    },
    {
      name: 'Settings',
      description: `Manage organization's settings (change its name, etc.)`,
      mapping: {
        'read-write': TargetAccessScope.Settings,
      },
    },
    {
      name: 'Tokens',
      description: `Manage access tokens`,
      mapping: {
        'read-only': TargetAccessScope.TokensRead,
        'read-write': TargetAccessScope.TokensWrite,
      },
    },
  ],
};

export function useRedirect({
  canAccess,
  entity,
  redirectTo,
}: {
  canAccess: boolean;
  redirectTo?: (router: Router) =>
    | {
        route: string;
        as: string;
      }
    | undefined;
  entity?: any;
}) {
  const router = useRouteSelector();
  const redirectRef = React.useRef(false);
  React.useEffect(() => {
    if (!redirectTo) {
      return;
    }

    if (!canAccess && entity && !redirectRef.current) {
      redirectRef.current = true;
      const route = redirectTo(router);
      if (route) {
        router.push(route.route, route.as);
      }
    }
  }, [router, canAccess, redirectRef, redirectTo]);
}
