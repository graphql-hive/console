import * as GraphQLSchema from '@/gql/graphql';
import type { ResourceSelection } from '../../members/resource-selector';

/**
 * Converts a {ResourceSelection} object to human readable strings.
 */
export function resolveResources(
  organizationSlug: string,
  resources: ResourceSelection,
): null | Record<GraphQLSchema.PermissionLevel, Array<string>> {
  if (resources.mode === GraphQLSchema.ResourceAssignmentMode.All || !resources.projects) {
    return null;
  }

  const resolvedResources: Record<GraphQLSchema.PermissionLevel, Array<string>> = {
    [GraphQLSchema.PermissionLevel.Organization]: [organizationSlug],
    [GraphQLSchema.PermissionLevel.Project]: [],
    [GraphQLSchema.PermissionLevel.Target]: [],
    [GraphQLSchema.PermissionLevel.AppDeployment]: [],
    [GraphQLSchema.PermissionLevel.Service]: [],
  };

  for (const project of resources.projects) {
    resolvedResources[GraphQLSchema.PermissionLevel.Project].push(
      `${organizationSlug}/${project.projectSlug}`,
    );
    if (project.targets.mode === GraphQLSchema.ResourceAssignmentMode.All) {
      resolvedResources[GraphQLSchema.PermissionLevel.Target].push(
        `${organizationSlug}/${project.projectSlug}/*`,
      );
      resolvedResources[GraphQLSchema.PermissionLevel.Service].push(
        `${organizationSlug}/${project.projectSlug}/*/service/*`,
      );
      resolvedResources[GraphQLSchema.PermissionLevel.AppDeployment].push(
        `${organizationSlug}/${project.projectSlug}/*/appDeployment/*`,
      );
      continue;
    }
    for (const target of project.targets.targets) {
      resolvedResources[GraphQLSchema.PermissionLevel.Target].push(
        `${organizationSlug}/${project.projectSlug}/${target.targetSlug}`,
      );
      if (target.services.mode === GraphQLSchema.ResourceAssignmentMode.All) {
        resolvedResources[GraphQLSchema.PermissionLevel.Service].push(
          `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/service/*`,
        );
      } else if (target.services.services) {
        for (const service of target.services.services) {
          resolvedResources[GraphQLSchema.PermissionLevel.Service].push(
            `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/service/${service.serviceName}`,
          );
        }
      }
      if (target.appDeployments.mode === GraphQLSchema.ResourceAssignmentMode.All) {
        resolvedResources[GraphQLSchema.PermissionLevel.AppDeployment].push(
          `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/appDeployment/*`,
        );
      } else if (target.appDeployments.appDeployments) {
        for (const appDeployment of target.appDeployments.appDeployments) {
          resolvedResources[GraphQLSchema.PermissionLevel.AppDeployment].push(
            `${organizationSlug}/${project.projectSlug}/${target.targetSlug}/appDeployment/${appDeployment.appDeployment}`,
          );
        }
      }
    }
  }

  return resolvedResources;
}

export function permissionLevelToResourceName(level: GraphQLSchema.PermissionLevel) {
  switch (level) {
    case GraphQLSchema.PermissionLevel.Organization: {
      return 'organizations';
    }
    case GraphQLSchema.PermissionLevel.Project: {
      return 'projects';
    }
    case GraphQLSchema.PermissionLevel.Target: {
      return 'targets';
    }
    case GraphQLSchema.PermissionLevel.Service: {
      return 'services';
    }
    case GraphQLSchema.PermissionLevel.AppDeployment: {
      return 'app deployments';
    }
  }
}
