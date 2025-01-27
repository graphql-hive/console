import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import * as GraphQLSchema from '../../../__generated__/types';
import { type Organization, type Project } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';
import { isUUID } from '../../../shared/is-uuid';
import { AppDeploymentNameModel } from '../../app-deployments/providers/app-deployments';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { Storage } from '../../shared/providers/storage';
import { OrganizationMemberRoles, type OrganizationMemberRole } from './organization-member-roles';

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
const AssignedProjectsModel = z.union([GranularAssignedProjectsModel, WildcardAssignmentMode]);

/**
 * Resource assignments as stored within the database.
 */
type ResourceAssignmentGroup = z.TypeOf<typeof AssignedProjectsModel>;
type GranularAssignedProjects = z.TypeOf<typeof GranularAssignedProjectsModel>;

const RawOrganizationMembershipModel = z.object({
  userId: z.string(),
  roleId: z.string(),
  connectedToZendesk: z
    .boolean()
    .nullable()
    .transform(value => value ?? false),
  /**
   * Resources that are assigned to the membership
   * If no resources are defined the permissions of the role are applied to all resources within the organization.
   */
  assignedResources: AssignedProjectsModel.nullable().transform(
    value => value ?? { mode: '*' as const, projects: [] },
  ),
});

export type OrganizationMembershipRoleAssignment = {
  role: OrganizationMemberRole;
  /**
   * Resource assignments as stored within the database.
   * They are used for displaying the selection UI on the frontend.
   */
  resources: ResourceAssignmentGroup;
  /**
   * Resolved resource groups, used for runtime permission checks.
   */
  resolvedResources: ResolvedResourceAssignments;
};

export type OrganizationMembership = {
  organizationId: string;
  isOwner: boolean;
  userId: string;
  assignedRole: OrganizationMembershipRoleAssignment;
  connectedToZendesk: boolean;
};

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class OrganizationMembers {
  private logger: Logger;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    private organizationMemberRoles: OrganizationMemberRoles,
    private storage: Storage,
    logger: Logger,
  ) {
    this.logger = logger.child({
      source: 'OrganizationMembers',
    });
  }

  private async findOrganizationMembers(
    organizationId: string,
    userIds: Array<string> | null = null,
  ) {
    const query = sql`
      SELECT
        ${organizationMemberFields(sql`"om"`)}
      FROM
        "organization_member" AS "om"
      WHERE
        "om"."organization_id" = ${organizationId}
        ${userIds ? sql`AND "om"."user_id" = ANY(${sql.array(userIds, 'uuid')})` : sql``}
    `;

    const result = await this.pool.any<unknown>(query);
    return result.map(row => RawOrganizationMembershipModel.parse(row));
  }

  /**
   * Handles legacy scopes and role assignments and automatically transforms
   * them into resource based role assignments.
   */
  private async resolveMemberships(
    organization: Organization,
    organizationMembers: Array<z.TypeOf<typeof RawOrganizationMembershipModel>>,
  ) {
    const organizationMembershipByUserId = new Map</* userId */ string, OrganizationMembership>();

    // Roles that are assigned using the legacy "single role" way
    const roleLookups = new Set<string>();

    for (const record of organizationMembers) {
      roleLookups.add(record.roleId);
    }

    if (roleLookups.size) {
      // This handles the legacy "single" role assignments
      // We load the roles and then attach them to the already loaded membership role
      const roleIds = Array.from(roleLookups);

      this.logger.debug('Lookup role assignments. (roleIds=%o)', roleIds);

      const memberRolesById = await this.organizationMemberRoles.findMemberRolesByIds(roleIds);

      for (const record of organizationMembers) {
        const membershipRole = memberRolesById.get(record.roleId);
        if (!membershipRole) {
          throw new Error('Could not resolve role.');
        }

        const resources: ResourceAssignmentGroup = record.assignedResources ?? {
          mode: '*',
          projects: [],
        };

        const resolvedResources = resolveResourceAssignment({
          organizationId: organization.id,
          projects: resources,
        });

        organizationMembershipByUserId.set(record.userId, {
          organizationId: organization.id,
          userId: record.userId,
          isOwner: organization.ownerId === record.userId,
          connectedToZendesk: record.connectedToZendesk,
          assignedRole: {
            resources,
            resolvedResources,
            role: membershipRole,
          },
        });
      }
    }

    return organizationMembershipByUserId;
  }

  async findOrganizationMembersForOrganization(organization: Organization) {
    this.logger.debug(
      'Find organization members for organization. (organizationId=%s)',
      organization.id,
    );
    const organizationMembers = await this.findOrganizationMembers(organization.id);
    const mapping = await this.resolveMemberships(organization, organizationMembers);

    return organizationMembers.map(record => {
      const member = mapping.get(record.userId);
      if (!member) {
        throw new Error('Could not find member.');
      }
      return member;
    });
  }

  /**
   * Batched loader function for a organization membership.
   */
  findOrganizationMembership = batchBy(
    (args: { organization: Organization; userId: string }) => args.organization.id,
    async args => {
      const organization = args[0].organization;
      const userIds = args.map(arg => arg.userId);

      this.logger.debug(
        'Find organization membership for users. (organizationId=%s, userIds=%o)',
        organization.id,
        userIds,
      );

      const organizationMembers = await this.findOrganizationMembers(organization.id, userIds);
      const mapping = await this.resolveMemberships(organization, organizationMembers);

      return userIds.map(async userId => mapping.get(userId) ?? null);
    },
  );

  findOrganizationOwner(organization: Organization): Promise<OrganizationMembership | null> {
    return this.findOrganizationMembership({
      organization,
      userId: organization.ownerId,
    });
  }

  async findOrganizationMembershipByEmail(
    organization: Organization,
    email: string,
  ): Promise<OrganizationMembership | null> {
    this.logger.debug(
      'Find organization membership by email. (organizationId=%s, email=%s)',
      organization.id,
      email,
    );
    const query = sql`
      SELECT
        ${organizationMemberFields(sql`"om"`)}
      FROM
        "organization_member" AS "om"
        INNER JOIN "users" AS "u"
          ON "u"."id" = "om"."user_id"
      WHERE
        "om"."organization_id" = ${organization.id}
        AND lower("u"."email") = lower(${email})
      LIMIT 1
    `;

    const result = await this.pool.maybeOne<unknown>(query);
    if (result === null) {
      return null;
    }

    const membership = RawOrganizationMembershipModel.parse(result);
    const mapping = await this.resolveMemberships(organization, [membership]);
    return mapping.get(membership.userId) ?? null;
  }

  async assignOrganizationMemberRole(args: {
    organizationId: string;
    roleId: string;
    userId: string;
    resourceAssignmentGroup: ResourceAssignmentGroup;
  }) {
    await this.pool.query(
      sql`/* assignOrganizationMemberRole */
        UPDATE
          "organization_member"
        SET
          "role_id" = ${args.roleId}
          , "assigned_resources" = ${JSON.stringify(
            /** we parse it to avoid additional properties being stored within the database. */
            AssignedProjectsModel.parse(args.resourceAssignmentGroup),
          )}
        WHERE
          "organization_id" = ${args.organizationId}
          AND "user_id" = ${args.userId}
      `,
    );
  }

  /**
   * This method translates the database stored member resource assignment to the GraphQL layer
   * exposed resource assignment.
   *
   * Note: This currently by-passes access checks, granting the viewer read access to all resources
   * within the organization.
   */
  async resolveGraphQLMemberResourceAssignment(
    member: OrganizationMembership,
  ): Promise<GraphQLSchema.ResolversTypes['ResourceAssignment']> {
    if (member.assignedRole.resources.mode === '*') {
      return { mode: 'all' };
    }
    const projects = await this.storage.findProjectsByIds({
      projectIds: member.assignedRole.resources.projects.map(project => project.id),
    });

    const filteredProjects = member.assignedRole.resources.projects.filter(row =>
      projects.get(row.id),
    );

    const targetAssignments = filteredProjects.flatMap(project =>
      project.targets.mode === 'granular' ? project.targets.targets : [],
    );

    const targets = await this.storage.findTargetsByIds({
      organizationId: member.organizationId,
      targetIds: targetAssignments.map(target => target.id),
    });

    return {
      mode: 'granular' as const,
      projects: filteredProjects
        .map(projectAssignment => {
          const project = projects.get(projectAssignment.id);
          if (!project || project.orgId !== member.organizationId) {
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
   * Transforms and resolves a {GraphQL.MemberResourceAssignmentInput} to a {ResourceAssignmentGroup}
   * that can be stored within our database
   *
   * - Projects and Targets that can not be found in our database are omitted from the resolved object.
   * - Projects and Targets that do not follow the hierarchical structure are omitted from teh resolved object.
   *
   * These measures are done in order to prevent users to grant access to other organizations.
   */
  async transformGraphQLMemberResourceAssignmentInputToResourceAssignmentGroup(
    organization: Organization,
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
      if (!project || project.orgId !== organization.id) {
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
      organizationId: organization.id,
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

const organizationMemberFields = (prefix = sql`"organization_member"`) => sql`
  ${prefix}."user_id" AS "userId"
  , ${prefix}."role_id" AS "roleId"
  , ${prefix}."connected_to_zendesk" AS "connectedToZendesk"
  , ${prefix}."assigned_resources" AS "assignedResources"
`;

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

type ResolvedResourceAssignments = {
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
function resolveResourceAssignment(args: {
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
