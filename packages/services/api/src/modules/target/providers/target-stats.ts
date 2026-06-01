import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import type { DateRange } from '../../../shared/entities';

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
    period: DateRange;
  }): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    for (const targetId of args.targetIds) {
      result.set(targetId, 0);
    }

    if (args.targetIds.length === 0) {
      return result;
    }

    const rows = await this.pool
      .any(
        psql`/* TargetStats.countSchemaVersionsByTargetIds */
          SELECT
            sv.target_id as target_id,
            COUNT(*)::int as total
          FROM schema_versions as sv
          LEFT JOIN targets as t ON (t.id = sv.target_id)
          LEFT JOIN projects as p ON (p.id = t.project_id)
          WHERE
            p.org_id = ${args.organizationId}
            AND t.project_id = ${args.projectId}
            AND sv.target_id = ANY(${psql.array(args.targetIds, 'uuid')})
            AND sv.created_at >= ${args.period.from.toISOString()}
            AND sv.created_at < ${args.period.to.toISOString()}
          GROUP BY sv.target_id
        `,
      )
      .then(
        z.array(
          z.object({
            target_id: z.string(),
            total: z.number(),
          }),
        ).parse,
      );

    for (const row of rows) {
      result.set(row.target_id, row.total);
    }

    return result;
  }
}
