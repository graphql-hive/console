import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import type { DateRange } from '../../../shared/entities';
import { batchBy } from '../../../shared/helpers';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class TargetStats {
  constructor(private pool: PostgresDatabasePool) {}

  async countSchemaVersionsByTargetIds(args: {
    organizationId: string;
    projectId: string;
    targetIds: readonly string[];
    period: DateRange | null;
  }): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (args.targetIds.length === 0) {
      return result;
    }

    const rows = await this.pool
      .any(
        psql`/* TargetStats.countSchemaVersionsByTargetIds */
          SELECT
            sv.target_id as "targetId",
            COUNT(*) as total
          FROM schema_versions as sv
          LEFT JOIN targets as t ON (t.id = sv.target_id)
          LEFT JOIN projects as p ON (p.id = t.project_id)
          WHERE
            p.org_id = ${args.organizationId}
            AND t.project_id = ${args.projectId}
            AND sv.target_id = ANY(${psql.array(args.targetIds, 'uuid')})
            ${
              args.period
                ? psql`
                  AND sv.created_at >= ${args.period.from.toISOString()}
                  AND sv.created_at < ${args.period.to.toISOString()}
                `
                : psql``
            }
          GROUP BY sv.target_id
        `,
      )
      .then(result => {
        return z
          .array(
            z.object({
              targetId: z.string(),
              total: z.number(),
            }),
          )
          .parse(result);
      });

    for (const row of rows) {
      result.set(row.targetId, row.total);
    }

    return result;
  }

  countSchemaVersionsOfTarget = batchBy<
    {
      organizationId: string;
      projectId: string;
      targetId: string;
      period: DateRange | null;
    },
    number
  >(
    item =>
      [
        item.organizationId,
        item.projectId,
        item.period?.from.toISOString() ?? 'all',
        item.period?.to.toISOString() ?? 'all',
      ].join(':'),
    async items => {
      const counts = await this.countSchemaVersionsByTargetIds({
        organizationId: items[0].organizationId,
        projectId: items[0].projectId,
        targetIds: items.map(item => item.targetId),
        period: items[0].period,
      });

      return items.map(item => Promise.resolve(counts.get(item.targetId) ?? 0));
    },
  );
}
