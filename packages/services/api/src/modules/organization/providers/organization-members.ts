import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { Organization } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { Storage } from '../../shared/providers/storage';
import { OrganizationMemberRole, OrganizationMemberRoles } from './organization-member-roles';

const WildcardAssignmentModel = z.literal('*');

const AppDeploymentAssignmentModel = z.object({
  type: z.literal('appDeployment'),
  appName: z.string(),
});

const ServiceAssignmentModel = z.object({ type: z.literal('service'), serviceName: z.string() });

const TargetAssignmentModel = z.object({
  type: z.literal('target'),
  id: z.string().uuid(),
  services: z.union([WildcardAssignmentModel, z.array(ServiceAssignmentModel)]),
  appDeployments: z.union([WildcardAssignmentModel, z.array(AppDeploymentAssignmentModel)]),
});

const ProjectAssignmentModel = z.object({
  type: z.literal('project'),
  id: z.string().uuid(),
  targets: z.union([WildcardAssignmentModel, z.array(TargetAssignmentModel)]),
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
const AssignedResourceModel = z.union([WildcardAssignmentModel, z.array(ProjectAssignmentModel)]);

/**
 * Resource assignments as stored within the database.
 */
type ResourceAssignmentGroup = z.TypeOf<typeof AssignedResourceModel>;

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
  // TODO: introduce this value
  // assignedResources: AssignedResourceModel.nullable().transform(value => value ?? '*'),
});

export type OrganizationMembershipRoleAssignment = {
  role: OrganizationMemberRole;
  /**
   * Resource assignments as stored within the database.
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

        // TODO: use value read from database
        const resources: ResourceAssignmentGroup = '*';

        organizationMembershipByUserId.set(record.userId, {
          organizationId: organization.id,
          userId: record.userId,
          isOwner: organization.ownerId === record.userId,
          connectedToZendesk: record.connectedToZendesk,
          assignedRole: {
            resources,
            resolvedResources: resolveResourceAssignment({
              organizationId: organization.id,
              projects: resources,
            }),
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
}

const organizationMemberFields = (prefix = sql`"organization_member"`) => sql`
  ${prefix}."user_id" AS "userId"
  , ${prefix}."role_id" AS "roleId"
  , ${prefix}."connected_to_zendesk" AS "connectedToZendesk"
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

  if (args.projects === '*') {
    return {
      organization: organizationAssignment,
      project: organizationAssignment,
      target: organizationAssignment,
      appDeployment: organizationAssignment,
      service: organizationAssignment,
    };
  }

  let projectAssignments: ResolvedResourceAssignments['project'] = [];
  let targetAssignments: ResolvedResourceAssignments['target'] = [];
  let serviceAssignments: ResolvedResourceAssignments['service'] = [];
  let appDeploymentAssignments: ResolvedResourceAssignments['appDeployment'] = [];

  for (const project of args.projects) {
    const projectAssignment: ProjectAssignment = {
      type: 'project',
      projectId: project.id,
    };
    projectAssignments.push(projectAssignment);

    if (project.targets === '*') {
      targetAssignments.push(projectAssignment);
      continue;
    }

    for (const target of project.targets) {
      const targetAssignment: TargetAssignment = {
        type: 'target',
        targetId: target.id,
      };

      targetAssignments.push(targetAssignment);

      // services
      if (target.services === '*') {
        serviceAssignments.push(targetAssignment);
      } else {
        for (const service of target.services) {
          serviceAssignments.push({
            type: 'service',
            targetId: target.id,
            serviceName: service.serviceName,
          });
        }
      }

      // app deployments
      if (target.appDeployments === '*') {
        appDeploymentAssignments.push(targetAssignment);
      } else {
        for (const appDeployment of target.appDeployments) {
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
