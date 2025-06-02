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
