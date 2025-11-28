import { DatabasePool, sql } from 'slonik';
import { z } from 'zod';

export async function purgeExpiredSchemaChecks(args: { pool: DatabasePool; expiresAt: Date }) {
  const SchemaCheckModel = z.object({
    schemaCheckIds: z.array(z.string()),
    sdlStoreIds: z.array(z.string()),
    contextIds: z.array(z.string()),
    targetIds: z.array(z.string()),
    contractIds: z.array(z.string()),
  });

  return await args.pool.transaction(async pool => {
    const date = args.expiresAt.toISOString();
    const rawData = await pool.maybeOne<unknown>(sql`/* findSchemaChecksToPurge */
      WITH "filtered_schema_checks" AS (
        SELECT *
        FROM "schema_checks"
        WHERE "expires_at" <= ${date}
      )
      SELECT
        ARRAY(SELECT "filtered_schema_checks"."id" FROM "filtered_schema_checks") AS "schemaCheckIds",
        ARRAY(SELECT DISTINCT "filtered_schema_checks"."target_id" FROM "filtered_schema_checks") AS "targetIds",
        ARRAY(
          SELECT DISTINCT "filtered_schema_checks"."schema_sdl_store_id"
          FROM "filtered_schema_checks"
          WHERE "filtered_schema_checks"."schema_sdl_store_id" IS NOT NULL

          UNION SELECT DISTINCT "filtered_schema_checks"."composite_schema_sdl_store_id"
          FROM "filtered_schema_checks"
          WHERE "filtered_schema_checks"."composite_schema_sdl_store_id" IS NOT NULL

          UNION SELECT DISTINCT "filtered_schema_checks"."supergraph_sdl_store_id"
          FROM "filtered_schema_checks"
          WHERE "filtered_schema_checks"."supergraph_sdl_store_id" IS NOT NULL

          UNION SELECT DISTINCT "contract_checks"."composite_schema_sdl_store_id"
          FROM "contract_checks"
            INNER JOIN "filtered_schema_checks" ON "contract_checks"."schema_check_id" = "filtered_schema_checks"."id"
          WHERE "contract_checks"."composite_schema_sdl_store_id" IS NOT NULL

          UNION SELECT DISTINCT "contract_checks"."supergraph_sdl_store_id" FROM "filtered_schema_checks"
            INNER JOIN "contract_checks" ON "contract_checks"."schema_check_id" = "filtered_schema_checks"."id"
            WHERE "contract_checks"."supergraph_sdl_store_id" IS NOT NULL
        ) AS "sdlStoreIds",
        ARRAY(
          SELECT DISTINCT "filtered_schema_checks"."context_id"
          FROM "filtered_schema_checks"
          WHERE "filtered_schema_checks"."context_id" IS NOT NULL
        ) AS "contextIds",
        ARRAY(
          SELECT DISTINCT "contract_checks"."contract_id"
          FROM "contract_checks"
            INNER JOIN "filtered_schema_checks" ON "contract_checks"."schema_check_id" = "filtered_schema_checks"."id"
        ) AS "contractIds"
    `);

    const data = SchemaCheckModel.parse(rawData);

    if (!data.schemaCheckIds.length) {
      return {
        deletedSchemaCheckCount: 0,
        deletedSdlStoreCount: 0,
        deletedSchemaChangeApprovalCount: 0,
        deletedContractSchemaChangeApprovalCount: 0,
      };
    }

    let deletedSdlStoreCount = 0;
    let deletedSchemaChangeApprovalCount = 0;
    let deletedContractSchemaChangeApprovalCount = 0;

    await pool.any<unknown>(sql`/* purgeExpiredSchemaChecks */
      DELETE
      FROM "schema_checks"
      WHERE
        "id" = ANY(${sql.array(data.schemaCheckIds, 'uuid')})
    `);

    if (data.sdlStoreIds.length) {
      deletedSdlStoreCount = await pool.oneFirst<number>(sql`/* purgeExpiredSdlStore */
        WITH "deleted" AS (
          DELETE
          FROM
            "sdl_store"
          WHERE
            "id" = ANY(
              ${sql.array(data.sdlStoreIds, 'text')}
            )
            AND NOT EXISTS (
              SELECT
                1
              FROM
                "schema_checks"
              WHERE
                "schema_checks"."schema_sdl_store_id" = "sdl_store"."id"
                OR "schema_checks"."composite_schema_sdl_store_id" = "sdl_store"."id"
                OR "schema_checks"."supergraph_sdl_store_id" = "sdl_store"."id"
            )
            AND NOT EXISTS (
              SELECT
                1
              FROM
                "contract_checks"
              WHERE
               "contract_checks"."composite_schema_sdl_store_id" = "sdl_store"."id"
               OR "contract_checks"."supergraph_sdl_store_id" = "sdl_store"."id"
            )
          RETURNING
            "id"
        ) SELECT COUNT(*) FROM "deleted"
      `);
    }

    if (data.targetIds.length && data.contextIds.length) {
      deletedSchemaChangeApprovalCount =
        await pool.oneFirst<number>(sql`/* purgeExpiredSchemaChangeApprovals */
        WITH "deleted" AS (
          DELETE
          FROM
            "schema_change_approvals"
          WHERE
            "target_id" = ANY(
              ${sql.array(data.targetIds, 'uuid')}
            )
            AND "context_id" = ANY(
              ${sql.array(data.contextIds, 'text')}
            )
            AND NOT EXISTS (
              SELECT
                1
              FROM "schema_checks"
              WHERE
                "schema_checks"."target_id" = "schema_change_approvals"."target_id"
                AND "schema_checks"."context_id" = "schema_change_approvals"."context_id"
            )
          RETURNING
            "target_id"
        ) SELECT COUNT(*) FROM "deleted"
      `);
    }

    if (data.contractIds.length && data.contextIds.length) {
      deletedContractSchemaChangeApprovalCount =
        await pool.oneFirst<number>(sql`/* purgeExpiredContractSchemaChangeApprovals */
        WITH "deleted" AS (
          DELETE
          FROM
            "contract_schema_change_approvals"
          WHERE
            "contract_id" = ANY(
              ${sql.array(data.contractIds, 'uuid')}
            )
            AND "context_id" = ANY(
              ${sql.array(data.contextIds, 'text')}
            )
            AND NOT EXISTS (
              SELECT
                1
              FROM
                "schema_checks"
                  INNER JOIN "contract_checks"
                    ON "contract_checks"."schema_check_id" = "schema_checks"."id"
              WHERE
                "contract_checks"."contract_id" = "contract_schema_change_approvals"."contract_id"
                AND "schema_checks"."context_id" = "contract_schema_change_approvals"."context_id"
            )
          RETURNING
            "contract_id"
        ) SELECT COUNT(*) FROM "deleted"
      `);
    }

    return {
      deletedSchemaCheckCount: data.schemaCheckIds.length,
      deletedSdlStoreCount,
      deletedSchemaChangeApprovalCount,
      deletedContractSchemaChangeApprovalCount,
    };
  });
}
