import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import { batch } from '../../../shared/helpers';
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

    return groupIds.map(async groupId => totalCountByGroupId.get(groupId) ?? 0);
  });

  async getTotalMemberCountByGroupId(groupId: string): Promise<number> {
    this.logger.debug(
      'batch lookup total member count by group by id lookup (groupId=%s)',
      groupId,
    );
    return await this.getTotalMemberCountForGroupIdBatched(groupId);
  }
}
