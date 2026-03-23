import * as GraphQLSchema from '@/gql/graphql';
import type { ResourceSelection } from '../../members/resource-selector';

/**
 * Converts a {ResourceSelection} object to human readable strings.
 */
export function resolveResources(
  organizationSlug: string,
  resources: ResourceSelection,
): null | Record<GraphQLSchema.PermissionLevelType, Array<string>> {
  if (resources.mode === GraphQLSchema.ResourceAssignmentModeType.All || !resources.projects) {
    return null;
  }

  const resolvedResources: Record<GraphQLSchema.PermissionLevelType, Array<string>> = {
    [GraphQLSchema.PermissionLevelType.Organization]: [organizationSlug],
    [GraphQLSchema.PermissionLevelType.Project]: [],
    [GraphQLSchema.PermissionLevelType.Target]: [],
    [GraphQLSchema.PermissionLevelType.AppDeployment]: [],
    [GraphQLSchema.PermissionLevelType.Service]: [],
  };

  for (const project of resources.projects) {
    resolvedResources[GraphQLSchema.PermissionLevelType.Project].push(
      `${organizationSlug}/${project.projectSlug}`,
    );
    if (project.targets.mode === GraphQLSchema.ResourceAssignmentModeType.All) {
      resolvedResources[GraphQLSchema.PermissionLevelType.Target].push(
        `${organizationSlug}/${project.projectSlug}/*`,
      );
      resolvedResources[GraphQLSchema.PermissionLevelType.Service].push(
        `${organizationSlug}/${project.projectSlug}/*/service/*`,
      );
      resolvedResources[GraphQLSchema.PermissionLevelType.AppDeployment].push(
        `${organizationSlug}/${project.projectSlug}/*/appDeployment/*`,
      );
      continue;
    }
    for (const target of project.targets.targets) {
      resolvedResources[GraphQLSchema.PermissionLevelType.Target].push(
        `${organizationSlug}/${project.projectSlug}/${target.targetSlug}`,
      );
      if (target.services.mode === GraphQLSchema.ResourceAssignmentModeType.All) {
        resolvedResources[GraphQLSchema.PermissionLevelType.Service].push(
          `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/service/*`,
        );
      } else if (target.services.services) {
        for (const service of target.services.services) {
          resolvedResources[GraphQLSchema.PermissionLevelType.Service].push(
            `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/service/${service.serviceName}`,
          );
        }
      }
      if (target.appDeployments.mode === GraphQLSchema.ResourceAssignmentModeType.All) {
        resolvedResources[GraphQLSchema.PermissionLevelType.AppDeployment].push(
          `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/appDeployment/*`,
        );
      } else if (target.appDeployments.appDeployments) {
        for (const appDeployment of target.appDeployments.appDeployments) {
          resolvedResources[GraphQLSchema.PermissionLevelType.AppDeployment].push(
            `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/appDeployment/${appDeployment.appDeployment}`,
          );
        }
      }
    }
  }

  return resolvedResources;
}

export function permissionLevelToResourceName(level: GraphQLSchema.PermissionLevelType) {
  switch (level) {
    case GraphQLSchema.PermissionLevelType.Organization: {
      return 'organizations';
    }
    case GraphQLSchema.PermissionLevelType.Project: {
      return 'projects';
    }
    case GraphQLSchema.PermissionLevelType.Target: {
      return 'targets';
    }
    case GraphQLSchema.PermissionLevelType.Service: {
      return 'services';
    }
    case GraphQLSchema.PermissionLevelType.AppDeployment: {
      return 'app deployments';
    }
  }
}

export const expirationPeriods: { name: string; value: GraphQLSchema.TokenExpirationPeriod }[] = [
  {
    name: 'Never',
    value: GraphQLSchema.TokenExpirationPeriod.Never,
  },
  {
    name: 'One Week',
    value: GraphQLSchema.TokenExpirationPeriod.OneWeek,
  },
  {
    name: 'Two Weeks',
    value: GraphQLSchema.TokenExpirationPeriod.TwoWeeks,
  },
  {
    name: 'One Month',
    value: GraphQLSchema.TokenExpirationPeriod.OneMonth,
  },
  {
    name: 'Six Months',
    value: GraphQLSchema.TokenExpirationPeriod.SixMonths,
  },
  {
    name: 'One Year',
    value: GraphQLSchema.TokenExpirationPeriod.OneYear,
  },
];

export function timeRelative(d: Date, prefix: string = '', pastText: string = 'now') {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  // Define our units in milliseconds
  const units = [
    { label: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
    { label: 'month', ms: 1000 * 60 * 60 * 24 * 30 }, // Approximation
    { label: 'day', ms: 1000 * 60 * 60 * 24 },
    { label: 'hour', ms: 1000 * 60 * 60 },
    { label: 'minute', ms: 1000 * 60 },
    { label: 'second', ms: 1000 },
  ] as const;
  // Find the first unit where the difference is at least 1
  const diffMS = d.getTime() - Date.now();
  for (const unit of units) {
    const value = Math.round(diffMS / unit.ms);

    if (value >= 1) {
      return `${prefix.length ? `${prefix} ` : ''}${rtf.format(value, unit.label)}`;
    }
  }
  return pastText;
}
