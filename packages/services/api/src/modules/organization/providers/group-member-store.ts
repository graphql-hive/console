import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql, type CommonQueryMethods } from '@hive/postgres';
import { invariant } from '@hive/service-common';
import { batch, batchBy } from '../../../shared/helpers';
import { Logger } from '../../shared/providers/logger';

@Injectable({
  scope: Scope.Operation,
})
export class GroupMemberStore {
  private logger: Logger;

  constructor(
    logger: Logger,
    private pool: PostgresDatabasePool,
  ) {
    this.logger = logger.child({
      source: 'GroupMemberStore',
    });
  }

  private getTotalMemberCountForGroupIdBatched = batch<string, number>(async groupIds => {
    this.logger.debug('lookup total member count for group ids batch (groupIds=%o', groupIds);
    const query = psql` /* getTotalMemberCountForGroupIdBatched */
      SELECT
        "group_id" AS "groupId"
        , COUNT(*) AS "totalCount"
      FROM
        "group_members"
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
  });

  async getTotalMemberCountByGroupId(groupId: string): Promise<number> {
    this.logger.debug(
      'batch lookup total member count by group by id lookup (groupId=%s)',
      groupId,
    );
    return await this.getTotalMemberCountForGroupIdBatched(groupId);
  }

  private _getGroupMemberForOrganizationIdAndUserBatchedByOrganizationId = batchBy(
    (args: { organizationId: string; userId: string }) => args.organizationId,
    async args => {
      const userIds = args.map(arg => arg.userId);

      const result = await this.pool.any(psql`
        SELECT ${groupMemberFields}
        FROM "group_members"
        WHERE
          "organization_id" = ${args[0].organizationId}
          AND "user_id" = ANY(${psql.array(userIds, 'uuid')})
      `);

      const groupMemberByUserId = new Map<string, Array<GroupMember>>();

      for (const row of result) {
        const member = GroupMemberModel.parse(row);
        invariant(member.organizationId === args[0].organizationId, 'Batching failed.');
        let memberGroups = groupMemberByUserId.get(member.userId);
        if (memberGroups == null) {
          memberGroups = [];
          groupMemberByUserId.set(member.userId, memberGroups);
        }
        memberGroups.push(member);
      }

      return userIds.map(userId => groupMemberByUserId.get(userId) ?? []);
    },
  );

  async getGroupMemberForOrganizationIdAndUserId(organizationId: string, userId: string) {
    return await this._getGroupMemberForOrganizationIdAndUserBatchedByOrganizationId({
      organizationId,
      userId,
    });
  }

  async getGroupMembersForOrganizationIdAndGroupId(organizationId: string, groupId: string) {
    const result = await this.pool.any(psql`
      SELECT ${groupMemberFields}
      FROM "group_members"
      WHERE
        "organization_id" = ${organizationId}
        AND "group_id" = ${groupId}
    `);
    return z.array(GroupMemberModel).parse(result);
  }

  async addGroupMembersToGroupByOrganizationIdAndGroupId(
    organizationId: string,
    groupId: string,
    userIds: Array<string>,
  ) {
    const logger = this.logger.child({
      organizationId,
      groupId,
    });

    logger.debug(
      'adding %d group members (organizationId=%s, groupId=%s)',
      userIds.length,
      organizationId,
      groupId,
    );

    const query = psql`
      INSERT INTO "group_members" (
        "organization_id"
        , "user_id"
        , "group_id"
      )
      SELECT
        "users"."provisioned_by_organization_id"
        , "users"."id"
        , ${groupId}
      FROM
        "users"
      WHERE
        "users"."id" = ANY(${psql.array(userIds, 'uuid')})
        AND "users"."provisioned_by_organization_id" = ${organizationId}
      ON CONFLICT (
        "organization_id"
        , "user_id"
        , "group_id"
      ) DO NOTHING
      RETURNING
        ${groupMemberFields}
    `;

    const rows = await this.pool.any(query).then(z.array(GroupMemberModel).parse);
    logger.debug(
      'added %d members (organizationId=%s, groupId=%s)',
      rows.length,
      organizationId,
      groupId,
    );

    return rows;
  }

  async removeGroupMembersFromGroupByOrganizationIdAndGroupId(
    organizationId: string,
    groupId: string,
    userIds: Array<string>,
  ) {
    const logger = this.logger.child({
      organizationId,
      groupId,
    });

    logger.debug('removing %d group members', userIds.length, organizationId, groupId);

    const query = psql`
      DELETE
      FROM
        "group_members"
      WHERE
        "organization_id" = ${organizationId}
        AND "group_id" = ${groupId}
        AND "user_id" = ANY(${psql.array(userIds, 'uuid')})
      RETURNING
        ${groupMemberFields}
    `;

    const rows = await this.pool.any(query).then(z.array(GroupMemberModel).parse);

    logger.debug('removed %d members', rows.length);

    return rows;
  }

  async removeAllGroupMembersFromGroupByOrganizationIdAndGroupId(
    organizationId: string,
    groupId: string,
  ) {
    const logger = this.logger.child({
      organizationId,
      groupId,
    });

    logger.debug('removing all group members', organizationId, groupId);

    const query = psql`
      DELETE
      FROM
        "group_members"
      WHERE
        "organization_id" = ${organizationId}
        AND "group_id" = ${groupId}
      RETURNING
        ${groupMemberFields}
    `;

    const rows = await this.pool.any(query).then(z.array(GroupMemberModel).parse);
    logger.debug('removed %d members', rows.length);

    return rows;
  }

  static async getGroupMemberForOrganizationIdAndUserId(
    pool: CommonQueryMethods,
    organizationId: string,
    userId: string,
  ) {
    const result = await pool.any(psql`
      SELECT ${groupMemberFields}
      FROM "group_members"
      WHERE
        "organization_id" = ${organizationId}
        AND "user_id" = ${userId}
      ORDER BY
        "user_id" DESC
    `);
    return z.array(GroupMemberModel).parse(result);
  }
}

const GroupMemberModel = z.object({
  id: z.string(),
  organizationId: z.string(),
  userId: z.string(),
  groupId: z.string(),
});

export type GroupMember = z.TypeOf<typeof GroupMemberModel>;

const groupMemberFields = psql`
 "id"
 , "organization_id" AS "organizationId"
 , "user_id" AS "userId"
 , "group_id" AS "groupId"
`;
