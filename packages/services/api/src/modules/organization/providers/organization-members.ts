import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { Organization } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';
import { isUUID } from '../../../shared/is-uuid';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { OrganizationMemberRole, OrganizationMemberRoles } from './organization-member-roles';

const RawOrganizationMembershipModel = z.object({
  userId: z.string(),
  roleId: z.string(),
  connectedToZendesk: z
    .boolean()
    .nullable()
    .transform(value => value ?? false),
});

const UUIDResourceAssignmentModel = z.union([z.literal('*'), z.array(z.string().uuid())]);

/**
 * String in the form `targetId/serviceName`
 * Example: `f81ce726-2abf-4653-bf4c-d8436cde255a/users`
 */
const ServiceResourceAssignmentStringModel = z
  .string()
  .refine(value => {
    const [targetId, serviceName = ''] = value.split('/');
    if (isUUID(targetId) === false || serviceName === '') {
      return false;
    }
    return true;
  }, 'Invalid service resource assignment')
  .transform(value => value.split('/') as [targetId: string, serviceName: string]);

const ServiceResourceAssignmentModel = z.union([
  z.literal('*'),
  z.array(ServiceResourceAssignmentStringModel),
]);

const ResourceAssignmentGroupModel = z.object({
  /** Resources assigned to a 'projects' permission group */
  project: UUIDResourceAssignmentModel,
  /** Resources assigned to a 'targets' permission group */
  target: UUIDResourceAssignmentModel,
  /** Resources assigned to a 'service' permission group */
  service: ServiceResourceAssignmentModel,
  /** Resources assigned to a 'appDeployment' permission group */
  appDeployment: ServiceResourceAssignmentModel,
});

/**
 * Resource assignments as stored within the database.
 */
type ResourceAssignmentGroup = z.TypeOf<typeof ResourceAssignmentGroupModel>;

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
        "om"."user_id" AS "userId"
        , "om"."role_id" AS "roleId"
        , "om"."connected_to_zendesk" AS "connectedToZendesk"
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

        // TODO: see if membership has resource assignments
        const resources: ResourceAssignmentGroup = {
          project: '*',
          target: '*',
          service: '*',
          appDeployment: '*',
        };

        organizationMembershipByUserId.set(record.userId, {
          organizationId: organization.id,
          userId: record.userId,
          isOwner: organization.ownerId === record.userId,
          connectedToZendesk: record.connectedToZendesk,
          assignedRole: {
            resources,
            resolvedResources: resolveResourceAssignment({
              organizationId: organization.id,
              groups: resources,
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
        "om"."user_id" AS "userId"
        , "om"."role_id" AS "roleId"
        , "om"."connected_to_zendesk" AS "connectedToZendesk"
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
  target: OrganizationAssignment | Array<ProjectAssignment> | Array<TargetAssignment>;
  service:
    | OrganizationAssignment
    | Array<ProjectAssignment>
    | Array<TargetAssignment>
    | Array<ServiceAssignment>;
  appDeployment:
    | OrganizationAssignment
    | Array<ProjectAssignment>
    | Array<TargetAssignment>
    | Array<AppDeploymentAssignment>;
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
  groups: ResourceAssignmentGroup;
}): ResolvedResourceAssignments {
  const organization: OrganizationAssignment = {
    type: 'organization',
    organizationId: args.organizationId,
  };

  let project: ResolvedResourceAssignments['project'] = organization;

  if (args.groups.project !== '*') {
    project = args.groups.project.map(projectId => ({
      type: 'project',
      projectId,
    }));
  }

  let target: ResolvedResourceAssignments['target'] = project;

  if (args.groups.target !== '*') {
    target = args.groups.target.map(targetId => ({
      type: 'target',
      targetId,
    }));
  }

  let service: ResolvedResourceAssignments['service'] = target;

  if (args.groups.service !== '*') {
    service = args.groups.service.map(([targetId, serviceName]) => ({
      type: 'service',
      targetId,
      serviceName,
    }));
  }

  let appDeployment: ResolvedResourceAssignments['appDeployment'] = target;

  if (args.groups.service !== '*') {
    appDeployment = args.groups.service.map(([targetId, appDeploymentName]) => ({
      type: 'appDeployment',
      targetId,
      appDeploymentName,
    }));
  }

  return {
    organization,
    project,
    target,
    service,
    appDeployment,
  };
}
