import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql, type CommonQueryMethods } from '@hive/postgres';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
} from '@hive/storage';
import { batch, cache } from '../../../shared/helpers';
import { isUUID } from '../../../shared/is-uuid';
import { Logger } from '../../shared/providers/logger';

@Injectable({
  scope: Scope.Operation,
})
export class GroupStore {
  private logger: Logger;

  constructor(
    logger: Logger,
    private pool: PostgresDatabasePool,
  ) {
    this.logger = logger.child({
      source: 'GroupStore',
    });
  }

  static async getGroupsByIds(pool: CommonQueryMethods, groupIds: Array<string>) {
    const query = psql` /* getGroupById (batch) */
      SELECT
        ${groupFields}
      FROM
        "groups"
      WHERE
        "id" = ANY(${psql.array(groupIds, 'uuid')})
    `;

    const result = await pool.any(query);
    return z.array(GroupModel).parse(result);
  }

  private _getGroupByIdBatched = batch<string, Group | null>(async groupIds => {
    this.logger.debug('lookup group batch (groupIds=%o', groupIds);
    const result = await GroupStore.getGroupsByIds(this.pool, groupIds);
    const groupsById = new Map<string, Group>();

    for (const group of result) {
      groupsById.set(group.id, group);
    }

    return groupIds.map(groupId => groupsById.get(groupId) ?? null);
  });

  @cache((groupId: string) => groupId)
  async getGroupById(groupId: string): Promise<Group | null> {
    this.logger.debug('batch group by id lookup (groupId=%s)', groupId);

    if (!isUUID(groupId)) {
      this.logger.debug('invalid group id provided (groupId=%s)', groupId);
      return null;
    }

    return await this._getGroupByIdBatched(groupId);
  }

  async getGroupsByIds(groupIds: Array<string>): Promise<Array<Group | null>> {
    return await Promise.all(groupIds.map(id => this.getGroupById(id)));
  }

  async getPaginatedGroupsForOrganizationId(
    organizationId: string,
    args: {
      first: number | null;
      after: string | null;
    },
  ) {
    this.logger.debug('paginate groups for organization by id (organizationId=%s)', organizationId);

    let cursor: { id: string; createdAt: string } | null = null;
    if (args.after) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    const query = psql`
      SELECT
        ${groupFields}
      FROM
        "groups"
      WHERE
        "organization_id" = ${organizationId}
        ${
          cursor
            ? psql`
                AND (
                  (
                    "created_at" = ${cursor.createdAt}
                    AND "id" < ${cursor.id}
                  )
                  OR "created_at" < ${cursor.createdAt}
                )
              `
            : psql``
        }
      ORDER BY
        "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `;

    const records = await this.pool.any(query);

    let edges = records.map(row => {
      const node = GroupModel.parse(row);

      return {
        node,
        get cursor() {
          return encodeCreatedAtAndUUIDIdBasedCursor(node);
        },
      };
    });

    const hasNextPage = edges.length > limit;
    edges = edges.slice(0, limit);

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        get endCursor() {
          return edges[edges.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return edges[0]?.cursor ?? '';
        },
      },
    };
  }

  async createGroup(args: {
    organizationId: string;
    displayName: string;
    externalGroupId: string;
  }) {
    this.logger.debug(
      'create new group (organizationId=%s, externalGroupId=%s)',
      args.organizationId,
      args.externalGroupId,
    );
    const query = psql`/* createGroup */
      INSERT INTO "groups" (
        "organization_id"
        , "display_name"
        , "external_group_id"
      )
      VALUES (
        ${args.organizationId}
        , ${args.displayName}
        , ${args.externalGroupId}
      )
      RETURNING
        ${groupFields}
    `;

    return await this.pool.one(query).then(GroupModel.parse);
  }

  async disableGroup(args: { externalGroupId: string }) {
    const query = psql`/* disableGroup /*
      UPDATE
        "groups"
      SET
        "disabled_at" = NOW()
      WHERE
        "external_group_id" = ${args.externalGroupId}
      RETURNING
        ${groupFields}
    `;

    return await this.pool.one(query).then(GroupModel.parse);
  }
}

const GroupModel = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  displayName: z.string(),
  createdAt: z.string(),
  disabledAt: z.string().nullable(),
  externalGroupId: z.string().nullable(),
});

export type Group = z.TypeOf<typeof GroupModel>;

const groupFields = psql`
  "id"
  , "organization_id" AS "organizationId"
  , "display_name" AS "displayName"
  , to_json("created_at") AS "createdAt"
  , to_json("disabled_at") AS "disabledAt"
  , "external_group_id" AS "externalGroupId"
`;
