import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql } from '@hive/postgres';
import type { DateRange } from '../../../shared/entities';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class ProjectStats {
  constructor(private pool: PostgresDatabasePool) {}

  async getTargetIdsByProjectIds(args: {
    organizationId: string;
    projectIds: readonly string[];
  }): Promise<Map<string, readonly string[]>> {
    const result = new Map<string, string[]>();

    for (const projectId of args.projectIds) {
      result.set(projectId, []);
    }

    if (args.projectIds.length === 0) {
      return result;
    }

    const rows = await this.pool
      .any(
        psql`/* ProjectStats.getTargetIdsByProjectIds */
          SELECT
            t.id as id,
            t.project_id as project_id
          FROM targets as t
          LEFT JOIN projects as p ON (p.id = t.project_id)
          WHERE
            p.org_id = ${args.organizationId}
            AND t.project_id = ANY(${psql.array(args.projectIds, 'uuid')})
        `,
      )
      .then(
        z.array(
          z.object({
            id: z.string(),
            project_id: z.string(),
          }),
        ).parse,
      );

    for (const row of rows) {
      result.get(row.project_id)?.push(row.id);
    }

    return result;
  }

  async countSchemaVersionsByProjectIds(args: {
    organizationId: string;
    projectIds: readonly string[];
    period: DateRange;
  }): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    for (const projectId of args.projectIds) {
      result.set(projectId, 0);
    }

    if (args.projectIds.length === 0) {
      return result;
    }

    const rows = await this.pool
      .any(
        psql`/* ProjectStats.countSchemaVersionsByProjectIds */
          SELECT
            t.project_id as project_id,
            COUNT(*)::int as total
          FROM schema_versions as sv
          LEFT JOIN targets as t ON (t.id = sv.target_id)
          LEFT JOIN projects as p ON (p.id = t.project_id)
          WHERE
            p.org_id = ${args.organizationId}
            AND t.project_id = ANY(${psql.array(args.projectIds, 'uuid')})
            AND sv.created_at >= ${args.period.from.toISOString()}
            AND sv.created_at < ${args.period.to.toISOString()}
          GROUP BY t.project_id
        `,
      )
      .then(
        z.array(
          z.object({
            project_id: z.string(),
            total: z.number(),
          }),
        ).parse,
      );

    for (const row of rows) {
      result.set(row.project_id, row.total);
    }

    return result;
  }
}
