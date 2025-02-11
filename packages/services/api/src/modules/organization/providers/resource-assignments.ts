import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import * as GraphQLSchema from '../../../__generated__/types';
import type { Project } from '../../../shared/entities';
import { isUUID } from '../../../shared/is-uuid';
import { AppDeploymentNameModel } from '../../app-deployments/providers/app-deployments';
import {
  AuthorizationPolicyStatement,
  PermissionsPerResourceLevelAssignment,
} from '../../auth/lib/authz';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';

const WildcardAssignmentModeModel = z.literal('*');
const GranularAssignmentModeModel = z.literal('granular');

const WildcardAssignmentMode = z.object({
  mode: WildcardAssignmentModeModel,
});

const AppDeploymentAssignmentModel = z.object({
  type: z.literal('appDeployment'),
  appName: z.string(),
});

const ServiceAssignmentModel = z.object({ type: z.literal('service'), serviceName: z.string() });

const AssignedServicesModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    services: z
      .array(ServiceAssignmentModel)
      .optional()
      .nullable()
      .transform(value => value ?? []),
  }),
  WildcardAssignmentMode,
]);

const AssignedAppDeploymentsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    appDeployments: z.array(AppDeploymentAssignmentModel),
  }),
  WildcardAssignmentMode,
]);

const TargetAssignmentModel = z.object({
  type: z.literal('target'),
  id: z.string().uuid(),
  services: AssignedServicesModel,
  appDeployments: AssignedAppDeploymentsModel,
});

const AssignedTargetsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    targets: z.array(TargetAssignmentModel),
  }),
  WildcardAssignmentMode,
]);

const ProjectAssignmentModel = z.object({
  type: z.literal('project'),
  id: z.string().uuid(),
  targets: AssignedTargetsModel,
});

const GranularAssignedProjectsModel = z.object({
  mode: GranularAssignmentModeModel,
  projects: z.array(ProjectAssignmentModel),
});

/**
 * Tree data structure that represents the resources assigned to an organization member.
 *
 * Together with the assigned member role, these are used to determine whether a user is allowed
 * or not allowed to perform an action on a specific resource (project, target, service, or app deployment).
 *
 * If no resources are assigned to a member role, the permissions are granted on all the resources within the
 * organization.
 */
export const AssignedProjectsModel = z.union([
  GranularAssignedProjectsModel,
  WildcardAssignmentMode,
]);

/**
 * Resource assignments as stored within the database.
 */
export type ResourceAssignmentGroup = z.TypeOf<typeof AssignedProjectsModel>;
type GranularAssignedProjects = z.TypeOf<typeof GranularAssignedProjectsModel>;

@Injectable({
  scope: Scope.Operation,
})
export class ResourceAssignments {
  private logger: Logger;

  constructor(
    private storage: Storage,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'ResourceAssignments',
    });
  }

  async resolveGraphQLMemberResourceAssignment(args: {
    organizationId: string;
    resources: ResourceAssignmentGroup;
  }): Promise<GraphQLSchema.ResolversTypes['ResourceAssignment']> {
    if (args.resources.mode === '*') {
      return { mode: 'all' };
    }
    const projects = await this.storage.findProjectsByIds({
      projectIds: args.resources.projects.map(project => project.id),
    });

    const filteredProjects = args.resources.projects.filter(row => projects.get(row.id));

    const targetAssignments = filteredProjects.flatMap(project =>
      project.targets.mode === 'granular' ? project.targets.targets : [],
    );

    const targets = await this.storage.findTargetsByIds({
      organizationId: args.organizationId,
      targetIds: targetAssignments.map(target => target.id),
    });

    return {
      mode: 'granular' as const,
      projects: filteredProjects
        .map(projectAssignment => {
          const project = projects.get(projectAssignment.id);
          if (!project || project.orgId !== args.organizationId) {
            return null;
          }

          return {
            projectId: project.id,
            project,
            targets:
              projectAssignment.targets.mode === '*'
                ? { mode: 'all' as const }
                : {
                    mode: 'granular' as const,
                    targets: projectAssignment.targets.targets
                      .map(targetAssignment => {
                        const target = targets.get(targetAssignment.id);
                        if (!target) return null;

                        return {
                          targetId: target.id,
                          target,
                          services:
                            targetAssignment.services.mode === '*'
                              ? { mode: 'all' as const }
                              : {
                                  mode: 'granular' as const,
                                  services: targetAssignment.services.services.map(
                                    service => service.serviceName,
                                  ),
                                },
                          appDeployments:
                            targetAssignment.appDeployments.mode === '*'
                              ? { mode: 'all' as const }
                              : {
                                  mode: 'granular' as const,
                                  appDeployments:
                                    targetAssignment.appDeployments.appDeployments.map(
                                      deployment => deployment.appName,
                                    ),
                                },
                        };
                      })
                      .filter(isSome),
                  },
          };
        })
        .filter(isSome),
    };
  }

  /**
   * Transforms and resolves a {GraphQL.ResourceAssignmentInput} to a {ResourceAssignmentGroup}
   * that can be stored within our database
   *
   * - Projects and Targets that can not be found in our database are omitted from the resolved object.
   * - Projects and Targets that do not follow the hierarchical structure are omitted from teh resolved object.
   *
   * These measures are done in order to prevent users to grant access to other organizations.
   */
  async transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
    organizationId: string,
    input: GraphQLSchema.ResourceAssignmentInput,
  ): Promise<ResourceAssignmentGroup> {
    if (
      !input.projects ||
      // No need to resolve the projects if mode "all" is used.
      // We will not store the selection in the database.
      input.mode === 'all'
    ) {
      return {
        mode: '*',
      };
    }

    /** Mutable array that we populate with the resolved data from the database */
    const resourceAssignmentGroup: GranularAssignedProjects = {
      mode: 'granular',
      projects: [],
    };

    const sanitizedProjects = input.projects.filter(project => isUUID(project.projectId));

    const projects = await this.storage.findProjectsByIds({
      projectIds: sanitizedProjects.map(record => record.projectId),
    });

    // In case we are not assigning all targets to the project,
    // we need to  load all the targets/projects that would be assigned
    // for verifying they belong to the organization and/or project.
    // This prevents breaking permission boundaries through fault/sus input.
    const targetLookupIds = new Set<string>();
    const projectTargetAssignments: Array<{
      project: Project;
      /**  mutable array that is within "resourceAssignmentGroup" */
      projectTargets: Array<z.TypeOf<typeof TargetAssignmentModel>>;
      targets: readonly GraphQLSchema.TargetResourceAssignmentInput[];
    }> = [];

    for (const record of sanitizedProjects) {
      const project = projects.get(record.projectId);

      // In case the project was not found or does not belogn the the organization,
      // we omit it as it could grant an user permissions for a project within another organization.
      if (!project || project.orgId !== organizationId) {
        this.logger.debug('Omitted non-existing project.');
        continue;
      }

      const projectTargets: Array<z.TypeOf<typeof TargetAssignmentModel>> = [];

      resourceAssignmentGroup.projects.push({
        type: 'project',
        id: project.id,
        targets: {
          mode: record.targets.mode === 'all' ? '*' : 'granular',
          targets: projectTargets,
        },
      });

      // No need to resolve the projects if mode "a;ll" is used.
      // We will not store the selection in the database.
      if (record.targets.mode === 'all') {
        continue;
      }

      if (record.targets.targets) {
        const sanitizedTargets = record.targets.targets.filter(target => isUUID(target.targetId));
        for (const target of sanitizedTargets) {
          targetLookupIds.add(target.targetId);
        }
        projectTargetAssignments.push({
          projectTargets,
          targets: sanitizedTargets,
          project,
        });
      }
    }

    const targets = await this.storage.findTargetsByIds({
      organizationId,
      targetIds: Array.from(targetLookupIds),
    });

    for (const record of projectTargetAssignments) {
      for (const targetRecord of record.targets) {
        const target = targets.get(targetRecord.targetId);

        // In case the target was not found or does not belogn the the organization,
        // we omit it as it could grant an user permissions for a target within another organization.
        if (!target || target.projectId !== record.project.id) {
          this.logger.debug('Omitted non-existing target.');
          continue;
        }

        record.projectTargets.push({
          type: 'target',
          id: target.id,
          services:
            // monolith schemas do not have services.
            record.project.type === GraphQLSchema.ProjectType.SINGLE ||
            targetRecord.services.mode === 'all'
              ? { mode: '*' }
              : {
                  mode: 'granular',
                  services:
                    // TODO: it seems like we do not validate service names
                    targetRecord.services.services?.map(record => ({
                      type: 'service',
                      serviceName: record?.serviceName,
                    })) ?? [],
                },
          appDeployments:
            targetRecord.appDeployments.mode === 'all'
              ? { mode: '*' }
              : {
                  mode: 'granular',
                  appDeployments:
                    targetRecord.appDeployments.appDeployments
                      ?.filter(name => AppDeploymentNameModel.safeParse(name).success)
                      .map(record => ({
                        type: 'appDeployment',
                        appName: record.appDeployment,
                      })) ?? [],
                },
        });
      }
    }

    return resourceAssignmentGroup;
  }
}

function isSome<T>(input: T | null): input is Exclude<T, null> {
  return input != null;
}

type OrganizationAssignment = {
  type: 'organization';
  organizationId: string;
};

type ProjectAssignment = {
  type: 'project';
  projectId: string;
};

type TargetAssignment = {
  type: 'target';
  targetId: string;
};

type ServiceAssignment = {
  type: 'service';
  targetId: string;
  serviceName: string;
};

type AppDeploymentAssignment = {
  type: 'appDeployment';
  targetId: string;
  appDeploymentName: string;
};

export type ResourceAssignment =
  | OrganizationAssignment
  | ProjectAssignment
  | TargetAssignment
  | ServiceAssignment
  | AppDeploymentAssignment;

export type ResolvedResourceAssignments = {
  organization: OrganizationAssignment;
  project: OrganizationAssignment | Array<ProjectAssignment>;
  target: OrganizationAssignment | Array<ProjectAssignment | TargetAssignment>;
  service: OrganizationAssignment | Array<ProjectAssignment | TargetAssignment | ServiceAssignment>;
  appDeployment:
    | OrganizationAssignment
    | Array<ProjectAssignment | TargetAssignment | AppDeploymentAssignment>;
};

/**
 * This function resolves the "stored-in-database", user configuration to the actual resolved structure
 * Currently, we have the following hierarchy
 *
 *        organization
 *             v
 *           project
 *             v
 *           target
 *          v      v
 * app deployment  service
 *
 * If one level specifies "*", it needs to inherit the resources defined on the next upper level.
 */
export function resolveResourceAssignment(args: {
  organizationId: string;
  projects: ResourceAssignmentGroup;
}): ResolvedResourceAssignments {
  const organizationAssignment: OrganizationAssignment = {
    type: 'organization',
    organizationId: args.organizationId,
  };

  if (args.projects.mode === '*') {
    return {
      organization: organizationAssignment,
      project: organizationAssignment,
      target: organizationAssignment,
      appDeployment: organizationAssignment,
      service: organizationAssignment,
    };
  }

  const projectAssignments: ResolvedResourceAssignments['project'] = [];
  const targetAssignments: ResolvedResourceAssignments['target'] = [];
  const serviceAssignments: ResolvedResourceAssignments['service'] = [];
  const appDeploymentAssignments: ResolvedResourceAssignments['appDeployment'] = [];

  for (const project of args.projects.projects) {
    const projectAssignment: ProjectAssignment = {
      type: 'project',
      projectId: project.id,
    };
    projectAssignments.push(projectAssignment);

    if (project.targets.mode === '*') {
      // allow actions on all sub-resources of this project
      targetAssignments.push(projectAssignment);
      serviceAssignments.push(projectAssignment);
      appDeploymentAssignments.push(projectAssignment);
      continue;
    }

    for (const target of project.targets.targets) {
      const targetAssignment: TargetAssignment = {
        type: 'target',
        targetId: target.id,
      };

      targetAssignments.push(targetAssignment);

      // services
      if (target.services.mode === '*') {
        // allow actions on all services of this target
        serviceAssignments.push(targetAssignment);
      } else {
        for (const service of target.services.services) {
          serviceAssignments.push({
            type: 'service',
            targetId: target.id,
            serviceName: service.serviceName,
          });
        }
      }

      // app deployments
      if (target.appDeployments.mode === '*') {
        // allow actions on all app deployments of this target
        appDeploymentAssignments.push(targetAssignment);
      } else {
        for (const appDeployment of target.appDeployments.appDeployments) {
          appDeploymentAssignments.push({
            type: 'appDeployment',
            targetId: target.id,
            appDeploymentName: appDeployment.appName,
          });
        }
      }
    }
  }

  return {
    organization: organizationAssignment,
    project: projectAssignments,
    target: targetAssignments,
    service: serviceAssignments,
    appDeployment: appDeploymentAssignments,
  };
}

function casesExhausted(_value: never): never {
  throw new Error('Not all cases were handled.');
}

export function toResourceIdentifier(organizationId: string, resource: ResourceAssignment): string;
export function toResourceIdentifier(
  organizationId: string,
  resource: ResourceAssignment | Array<ResourceAssignment>,
): Array<string>;
export function toResourceIdentifier(
  organizationId: string,
  resource: ResourceAssignment | Array<ResourceAssignment>,
): string | Array<string> {
  if (Array.isArray(resource)) {
    return resource.map(resource => toResourceIdentifier(organizationId, resource));
  }

  if (resource.type === 'organization') {
    return `hrn:${organizationId}:organization/${resource.organizationId}`;
  }

  if (resource.type === 'project') {
    return `hrn:${organizationId}:project/${resource.projectId}`;
  }

  if (resource.type === 'target') {
    return `hrn:${organizationId}:target/${resource.targetId}`;
  }

  if (resource.type === 'service') {
    return `hrn:${organizationId}:target/${resource.targetId}/service/${resource.serviceName}`;
  }

  if (resource.type === 'appDeployment') {
    return `hrn:${organizationId}:target/${resource.targetId}/appDeployment/${resource.appDeploymentName}`;
  }

  casesExhausted(resource);
}

export function translateResolvedResourcesToAuthorizationPolicyStatements(
  organizationId: string,
  permissions: PermissionsPerResourceLevelAssignment,
  resourceAssignments: ResolvedResourceAssignments,
) {
  const policyStatements: Array<AuthorizationPolicyStatement> = [];

  if (permissions.organization.size) {
    policyStatements.push({
      action: Array.from(permissions.organization),
      effect: 'allow',
      resource: toResourceIdentifier(organizationId, resourceAssignments.organization),
    });
  }

  if (permissions.project.size) {
    policyStatements.push({
      action: Array.from(permissions.project),
      effect: 'allow',
      resource: toResourceIdentifier(organizationId, resourceAssignments.project),
    });
  }

  if (permissions.target.size) {
    policyStatements.push({
      action: Array.from(permissions.target),
      effect: 'allow',
      resource: toResourceIdentifier(organizationId, resourceAssignments.target),
    });
  }

  if (permissions.service.size) {
    policyStatements.push({
      action: Array.from(permissions.service),
      effect: 'allow',
      resource: toResourceIdentifier(organizationId, resourceAssignments.service),
    });
  }

  if (permissions.appDeployment.size) {
    policyStatements.push({
      action: Array.from(permissions.appDeployment),
      effect: 'allow',
      resource: toResourceIdentifier(organizationId, resourceAssignments.appDeployment),
    });
  }

  return policyStatements;
}
