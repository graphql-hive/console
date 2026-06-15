import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { isUUID } from '@hive/api/shared/is-uuid';
import { PostgresDatabasePool, psql, type CommonQueryMethods } from '@hive/postgres';
import { batch } from '../../../shared/helpers';
import { Logger } from '../../shared/providers/logger';
import {
  ResourceAssignmentModel,
  type ResourceAssignmentGroup,
} from '../lib/resource-assignment-model';

@Injectable({
  scope: Scope.Operation,
})
export class GroupRoleAssignmentStore {
  private logger: Logger;

  constructor(
    logger: Logger,
    private pool: PostgresDatabasePool,
  ) {
    this.logger = logger.child({
      source: 'GroupRoleAssignmentStore',
    });
  }

  private getTotalGroupRoleAssignmentCountForGroupIdBatched = batch<string, number>(
    async groupIds => {
      this.logger.debug(
        'lookup total group role assignment count for group ids batch (groupIds=%o)',
        groupIds,
      );
      const query = psql` /* getTotalMemberCountForGroupIdBatched */
      SELECT
        "group_id" AS "groupId"
        , COUNT(*) AS "totalCount"
      FROM
        "group_role_assignments"
      WHERE
        "group_id" = ANY(${psql.array(groupIds, 'uuid')})
      GROUP BY
        "group_id"
    `;

      const result = await this.pool
        .any(query)
        .then(z.array(z.object({ groupId: z.string(), totalCount: z.number() })).parse);

      const totalCountByGroupId = new Map<string, number>();
      for (const record of result) {
        totalCountByGroupId.set(record.groupId, record.totalCount);
      }

      return groupIds.map(groupId => totalCountByGroupId.get(groupId) ?? 0);
    },
  );

  async getTotalGroupRoleAssignmentCountForGroupId(groupId: string): Promise<number> {
    this.logger.debug('batch lookup total member count by group by id (groupId=%s)', groupId);
    return await this.getTotalGroupRoleAssignmentCountForGroupIdBatched(groupId);
  }

  static async getGroupRoleAssignmentsForGroupIds(
    pool: CommonQueryMethods,
    groupIds: Array<string>,
  ) {
    const query = psql` /* getGroupRoleAssignmentsForGroupIdBatched */
      SELECT
        ${groupRoleAssignmentsFields}
      FROM
        "group_role_assignments"
      WHERE
        "group_id" = ANY(${psql.array(groupIds, 'uuid')})
      ORDER BY
        "group_id"
        , "id"
    `;

    const result = await pool.any(query);
    return z.array(GroupRoleAssignmentModel).parse(result);
  }

  private getGroupRoleAssignmentsForGroupIdBatched = batch<string, Array<GroupRoleAssignment>>(
    async groupIds => {
      this.logger.debug(
        'lookup group role assignments for group ids batch (groupIds=%o)',
        groupIds,
      );

      const records = await GroupRoleAssignmentStore.getGroupRoleAssignmentsForGroupIds(
        this.pool,
        groupIds,
      );
      const groupRoleAssignmentsByGroupId = new Map<string, Array<GroupRoleAssignment>>();
      for (const record of records) {
        let records = groupRoleAssignmentsByGroupId.get(record.groupId);
        if (records === undefined) {
          records = [];
          groupRoleAssignmentsByGroupId.set(record.groupId, records);
        }
        records.push(record);
      }

      return groupIds.map(groupId => groupRoleAssignmentsByGroupId.get(groupId) ?? []);
    },
  );

  async getGroupRoleAssignmentsForGroupId(groupId: string): Promise<Array<GroupRoleAssignment>> {
    this.logger.debug('batch lookup group role assignments by group id (groupId=%s)', groupId);
    return await this.getGroupRoleAssignmentsForGroupIdBatched(groupId).then(roleAssignments =>
      roleAssignments.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }

  async getGroupMappingById(groupMappingId: string) {
    this.logger.debug('get group mapping by id (groupMappingId=%s)', groupMappingId);

    if (!isUUID(groupMappingId)) {
      this.logger.debug('group mapping is not a uuid (groupMappingId=%s)', groupMappingId);
      return null;
    }

    const query = psql`/* getGroupMappingById */
      SELECT
        ${groupRoleAssignmentsFields}
      FROM
        "group_role_assignments"
      WHERE
        "id" = ${groupMappingId}
    `;

    return await this.pool.maybeOne(query).then(GroupRoleAssignmentModel.nullable().parse);
  }

  async createGroupMapping(args: {
    organizationId: string;
    groupId: string;
    roleId: string;
    resourceAssignment: ResourceAssignmentGroup;
  }) {
    this.logger.debug('create group mapping (groupId=%s, roleId=%s)', args.groupId, args.roleId);
    const query = psql`/* createGroupMapping */
      INSERT INTO "group_role_assignments" (
        "organization_id"
        , "group_id"
        , "role_id"
        , "assigned_resources"
      )
      VALUES (
        ${args.organizationId}
        , ${args.groupId}
        , ${args.roleId}
        , ${psql.jsonb(args.resourceAssignment)}
      )
      RETURNING
        ${groupRoleAssignmentsFields}
    `;

    return await this.pool.one(query).then(GroupRoleAssignmentModel.parse);
  }

  async updateGroupMapping(args: {
    groupMappingId: string;
    newRoleId: string | null;
    newResourceAssignment: ResourceAssignmentGroup | null;
  }) {
    const query = psql` /* updateGroupMapping */
      UPDATE "group_role_assignments"
      SET
       "role_id" = COALESCE(${args.newRoleId}, "role_id")
       , "assigned_resources" = COALESCE(${psql.jsonbOrNull(args.newResourceAssignment)}, "assigned_resources")
      WHERE
        "id" = ${args.groupMappingId}
      RETURNING
        ${groupRoleAssignmentsFields}
    `;

    return this.pool.one(query).then(GroupRoleAssignmentModel.parse);
  }

  async deleteGroupMapping(groupMappingId: string) {
    this.logger.debug('remove group mapping (groupMappingId=%s)', groupMappingId);
    const query = psql`/* removeGroupMapping */
      DELETE FROM "group_role_assignments"
      WHERE "id" = ${groupMappingId}
    `;
    await this.pool.query(query);
  }
}

const groupRoleAssignmentsFields = psql`
  "id"
  , "organization_id" AS "organizationId"
  , "group_id" AS "groupId"
  , "role_id" AS "roleId"
  , "assigned_resources" AS "assignedResources"
  , to_json("created_at") AS "createdAt"
`;

const GroupRoleAssignmentModel = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  groupId: z.string().uuid(),
  roleId: z.string().uuid(),
  assignedResources: ResourceAssignmentModel.transform(
    value => value ?? { mode: '*' as const, projects: [] },
  ),
  createdAt: z.string(),
});

export type GroupRoleAssignment = z.TypeOf<typeof GroupRoleAssignmentModel>;
