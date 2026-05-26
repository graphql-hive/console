import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { CommonQueryMethods, PostgresDatabasePool, psql } from '@hive/postgres';
import {
  ConditionalBreakingChangeMetadata,
  ConditionalBreakingChangeMetadataModel,
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
  HiveSchemaChangeModel,
  InsertConditionalBreakingChangeMetadataModel,
  SchemaChangeType,
  SchemaCompositionError,
  SchemaCompositionErrorModel,
} from '@hive/storage';
import type { Project, Target } from '../../../shared/entities';
import { batch } from '../../../shared/helpers';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class SchemaVersionStore {
  constructor(private pg: PostgresDatabasePool) {}

  private async insertSchemaVersion(
    trx: CommonQueryMethods,
    args: {
      isComposable: boolean;
      targetId: string;
      actionId: string;
      baseSchema: string | null;
      previousSchemaVersion: string | null;
      diffSchemaVersionId: string | null;
      compositeSchemaSDL: string | null;
      supergraphSDL: string | null;
      schemaCompositionErrors: Array<SchemaCompositionError> | null;
      tags: Array<string> | null;
      schemaMetadata: Record<
        string,
        Array<{ name: string; content: string; source: string | null }>
      > | null;
      metadataAttributes: Record<string, string[]> | null;
      hasContractCompositionErrors: boolean;
      github: null | {
        sha: string;
        repository: string;
      };
      conditionalBreakingChangeMetadata: ConditionalBreakingChangeMetadata | null;
    },
  ) {
    const query = psql`/* insertSchemaVersion */
      INSERT INTO schema_versions
        (
          record_version,
          is_composable,
          target_id,
          action_id,
          base_schema,
          has_persisted_schema_changes,
          previous_schema_version_id,
          diff_schema_version_id,
          composite_schema_sdl,
          supergraph_sdl,
          schema_composition_errors,
          github_repository,
          github_sha,
          tags,
          has_contract_composition_errors,
          conditional_breaking_change_metadata,
          schema_metadata,
          metadata_attributes
        )
      VALUES
        (
          '2024-01-10',
          ${args.isComposable},
          ${args.targetId},
          ${args.actionId},
          ${args.baseSchema},
          ${true},
          ${args.previousSchemaVersion},
          ${args.diffSchemaVersionId},
          ${args.compositeSchemaSDL},
          ${args.supergraphSDL},
          ${psql.jsonbOrNull(args.schemaCompositionErrors)},
          ${args.github?.repository ?? null},
          ${args.github?.sha ?? null},
          ${Array.isArray(args.tags) ? psql.array(args.tags, 'text') : null},
          ${args.hasContractCompositionErrors},
          ${psql.jsonbOrNull(InsertConditionalBreakingChangeMetadataModel.parse(args.conditionalBreakingChangeMetadata))},
          ${psql.jsonbOrNull(args.schemaMetadata)},
          ${psql.jsonbOrNull(args.metadataAttributes)}
        )
      RETURNING
        ${schemaVersionSQLFields()}
    `;

    return await trx.maybeOne(query).then(SchemaVersionModel.parse);
  }

  private async insertSchemaVersionChanges(
    trx: CommonQueryMethods,
    args: {
      changes: Array<SchemaChangeType>;
      versionId: string;
    },
  ) {
    if (args.changes.length === 0) {
      return;
    }

    await trx.query(psql`/* insertSchemaVersionChanges */
      INSERT INTO schema_version_changes (
        "schema_version_id",
        "change_type",
        "severity_level",
        "meta",
        "is_safe_based_on_usage"
      )
      SELECT * FROM
      ${psql.unnest(
        args.changes.map(change =>
          // Note: change.criticality.level is actually a computed value from meta
          [
            args.versionId,
            change.type,
            change.criticality,
            JSON.stringify(change.meta),
            change.isSafeBasedOnUsage ?? false,
          ],
        ),
        ['uuid', 'text', 'text', 'jsonb', 'bool'],
      )}
    `);
  }

  private async insertPushSchemaLog(
    trx: CommonQueryMethods,
    args: {
      author: string;
      service: string | null;
      url: string | null;
      commit: string;
      schema: string;
      projectId: string;
      targetId: string;
      metadata: string | null;
    },
  ) {
    const query = psql`/* insertSchemaLog */
      INSERT INTO "schema_log"
        (
          "author",
          "service_name",
          "service_url",
          "commit",
          "sdl",
          "project_id",
          "target_id",
          "metadata",
          "action"
        )
      VALUES
        (
        ${args.author},
        lower(${args.service}::text),
        ${args.url}::text,
        ${args.commit}::text,
        ${args.schema}::text,
        ${args.projectId},
        ${args.targetId},
        ${args.metadata},
        'PUSH'
      )
      RETURNING
        "id"
    `;
    return await trx.maybeOne(query).then(z.object({ id: z.string() }).parse);
  }

  private async insertSchemaVersionContract(
    trx: CommonQueryMethods,
    args: {
      schemaVersionId: string;
      contractId: string;
      contractName: string;
      compositeSchemaSDL: string | null;
      supergraphSDL: string | null;
      schemaCompositionErrors: Array<SchemaCompositionError> | null;
    },
  ): Promise<string> {
    const id = await trx.oneFirst(psql`/* insertSchemaVersionContract */
      INSERT INTO "contract_versions" (
        "schema_version_id"
        , "contract_id"
        , "contract_name"
        , "schema_composition_errors"
        , "composite_schema_sdl"
        , "supergraph_sdl"
      )
     VALUES (
        ${args.schemaVersionId}
        , ${args.contractId}
        , ${args.contractName}
        , ${psql.jsonbOrNull(args.schemaCompositionErrors)}
        , ${args.compositeSchemaSDL}
        , ${args.supergraphSDL}
      )
      RETURNING
        "id"
    `);

    return z.string().parse(id);
  }

  private async insertSchemaVersionContractChanges(
    trx: CommonQueryMethods,
    args: {
      changes: Array<SchemaChangeType> | null;
      schemaVersionContractId: string;
    },
  ) {
    if (!args.changes?.length) {
      return;
    }

    await trx.query(psql`/* insertSchemaVersionContractChanges */
      INSERT INTO "contract_version_changes" (
        "contract_version_id",
        "change_type",
        "severity_level",
        "meta",
        "is_safe_based_on_usage"
      )
      SELECT * FROM
      ${psql.unnest(
        args.changes.map(change =>
          // Note: change.criticality.level is actually a computed value from meta
          [
            args.schemaVersionContractId,
            change.type,
            change.criticality,
            JSON.stringify(change.meta),
            change.isSafeBasedOnUsage ?? false,
          ],
        ),
        ['uuid', 'text', 'text', 'jsonb', 'bool'],
      )}
    `);
  }

  async createSchemaVersion(
    args: {
      schema: string;
      author: string;
      service?: string | null;
      metadata: string | null;
      valid: boolean;
      url?: string | null;
      commit: string;
      logIds: string[];
      base_schema: string | null;
      actionFn(versionId: string): Promise<void>;
      changes: Array<SchemaChangeType>;
      previousSchemaVersion: null | string;
      diffSchemaVersionId: null | string;
      github: null | {
        repository: string;
        sha: string;
      };
      contracts: null | Array<CreateContractVersionInput>;
      conditionalBreakingChangeMetadata: null | ConditionalBreakingChangeMetadata;
      targetId: string;
      projectId: string;
      organizationId: string;
    } & (
      | {
          compositeSchemaSDL: null;
          supergraphSDL: null;
          schemaCompositionErrors: Array<SchemaCompositionError>;
          tags: null;
          schemaMetadata: null;
          metadataAttributes: null;
        }
      | {
          compositeSchemaSDL: string;
          supergraphSDL: string | null;
          schemaCompositionErrors: null;
          tags: null | Array<string>;
          schemaMetadata: null | Record<
            string,
            Array<{ name: string; content: string; source: string | null }>
          >;
          metadataAttributes: null | Record<string, string[]>;
        }
    ),
  ): Promise<SchemaVersion> {
    const url = args.url ?? null;
    const service = args.service ?? null;

    const output = await this.pg.transaction('createSchemaVersion', async trx => {
      const log = await this.insertPushSchemaLog(trx, {
        author: args.author,
        commit: args.commit,
        metadata: args.metadata,
        projectId: args.projectId,
        targetId: args.targetId,
        schema: args.schema,
        service,
        url,
      });

      // creates a new version
      const version = await this.insertSchemaVersion(trx, {
        isComposable: args.valid,
        targetId: args.targetId,
        actionId: log.id,
        baseSchema: args.base_schema,
        previousSchemaVersion: args.previousSchemaVersion,
        diffSchemaVersionId: args.diffSchemaVersionId,
        compositeSchemaSDL: args.compositeSchemaSDL,
        supergraphSDL: args.supergraphSDL,
        schemaCompositionErrors: args.schemaCompositionErrors,
        github: args.github,
        tags: args.tags,
        schemaMetadata: args.schemaMetadata,
        metadataAttributes: args.metadataAttributes,
        hasContractCompositionErrors:
          args.contracts?.some(c => c.schemaCompositionErrors != null) ?? false,
        conditionalBreakingChangeMetadata: args.conditionalBreakingChangeMetadata,
      });

      await trx.query(psql`/* insertSchemaVersionToLog */
        INSERT INTO schema_version_to_log
          (version_id, action_id)
        SELECT * FROM
          ${psql.unnest(
            args.logIds.concat(log.id).map(actionId =>
              // Note: change.criticality.level is actually a computed value from meta
              [version.id, actionId],
            ),
            ['uuid', 'uuid'],
          )}
      `);

      await this.insertSchemaVersionChanges(trx, {
        versionId: version.id,
        changes: args.changes,
      });

      for (const contract of args.contracts ?? []) {
        const schemaVersionContractId = await this.insertSchemaVersionContract(trx, {
          schemaVersionId: version.id,
          contractId: contract.contractId,
          contractName: contract.contractName,
          schemaCompositionErrors: contract.schemaCompositionErrors,
          compositeSchemaSDL: contract.compositeSchemaSDL,
          supergraphSDL: contract.supergraphSDL,
        });
        await this.insertSchemaVersionContractChanges(trx, {
          schemaVersionContractId,
          changes: contract.changes,
        });
      }

      await args.actionFn(version.id);

      return {
        version,
        log,
      };
    });

    return output.version;
  }

  async deleteSubgraphFromTarget(
    target: Target,
    args: {
      serviceName: string;
      composable: boolean;
      actionFn(versionId: string): Promise<void>;
      changes: Array<SchemaChangeType> | null;
      diffSchemaVersionId: string | null;
      conditionalBreakingChangeMetadata: null | ConditionalBreakingChangeMetadata;
      contracts: null | Array<CreateContractVersionInput>;
    } & (
      | {
          compositeSchemaSDL: null;
          supergraphSDL: null;
          schemaCompositionErrors: Array<SchemaCompositionError>;
          tags: null;
          schemaMetadata: null;
          metadataAttributes: null;
        }
      | {
          compositeSchemaSDL: string;
          supergraphSDL: string | null;
          schemaCompositionErrors: null;
          tags: null | Array<string>;
          schemaMetadata: null | Record<
            string,
            Array<{ name: string; content: string; source: string | null }>
          >;
          metadataAttributes: null | Record<string, string[]>;
        }
    ),
  ) {
    return this.pg.transaction('deleteSubgraphFromTarget', async trx => {
      // fetch the latest version
      const latestVersion = await trx
        .maybeOne(
          psql`/* findLatestSchemaVersion */
          SELECT
            "id"
            , "base_schema" AS "baseSchema"
          FROM "schema_versions"
          WHERE "target_id" = ${target.id}
          ORDER BY "created_at" DESC
          LIMIT 1
        `,
        )
        .then(z.object({ id: z.string(), baseSchema: z.string().nullable() }).parse);

      // create a new action
      const deleteActionResult = await trx
        .maybeOne(
          psql`/* createDeleteActionSchemaLog */
          INSERT INTO schema_log
            (
              "author",
              "commit",
              "service_name",
              "project_id",
              "target_id",
              "action"
            )
          VALUES
            (
              ${'system'}::text,
              ${'system'}::text,
              lower(${args.serviceName}::text),
              ${target.projectId},
              ${target.id},
              'DELETE'
            )
          RETURNING
            id
            , to_json("created_at") AS "createdAt"
            , "service_name" AS "serviceName"
            , "target_id" AS "targetId"
        `,
        )
        .then(
          z.object({
            id: z.string(),
            createdAt: z.string(),
            serviceName: z.string(),
            targetId: z.string(),
          }).parse,
        );

      // creates a new version
      const newVersion = await this.insertSchemaVersion(trx, {
        isComposable: args.composable,
        targetId: target.id,
        actionId: deleteActionResult.id,
        baseSchema: latestVersion.baseSchema,
        previousSchemaVersion: latestVersion.id,
        diffSchemaVersionId: args.diffSchemaVersionId,
        compositeSchemaSDL: args.compositeSchemaSDL,
        supergraphSDL: args.supergraphSDL,
        schemaCompositionErrors: args.schemaCompositionErrors,
        // Deleting a schema is done via CLI and not associated to a commit or a pull request.
        github: null,
        tags: args.tags,
        schemaMetadata: args.schemaMetadata,
        metadataAttributes: args.metadataAttributes,
        hasContractCompositionErrors:
          args.contracts?.some(c => c.schemaCompositionErrors != null) ?? false,
        conditionalBreakingChangeMetadata: args.conditionalBreakingChangeMetadata,
      });

      // Move all the schema_version_to_log entries of the previous version to the new version
      await trx.query(psql`/* moveSchemaVersionToLog */
        INSERT INTO schema_version_to_log
          (version_id, action_id)
        SELECT ${newVersion.id}::uuid as version_id, svl.action_id
        FROM schema_version_to_log svl
        LEFT JOIN schema_log sl ON (sl.id = svl.action_id)
        WHERE svl.version_id = ${latestVersion.id} AND sl.action = 'PUSH' AND lower(sl.service_name) != lower(${args.serviceName})
      `);

      await trx.query(psql`/* insertSchemaVersionToLog */
        INSERT INTO schema_version_to_log
          (version_id, action_id)
        VALUES
          (${newVersion.id}, ${deleteActionResult.id})
      `);

      if (args.changes != null) {
        await this.insertSchemaVersionChanges(trx, {
          versionId: newVersion.id,
          changes: args.changes,
        });
      }

      for (const contract of args.contracts ?? []) {
        const schemaVersionContractId = await this.insertSchemaVersionContract(trx, {
          schemaVersionId: newVersion.id,
          contractId: contract.contractId,
          contractName: contract.contractName,
          schemaCompositionErrors: contract.schemaCompositionErrors,
          compositeSchemaSDL: contract.compositeSchemaSDL,
          supergraphSDL: contract.supergraphSDL,
        });
        await this.insertSchemaVersionContractChanges(trx, {
          schemaVersionContractId,
          changes: contract.changes,
        });
      }

      await args.actionFn(newVersion.id);

      return {
        kind: 'composite',
        id: deleteActionResult.id,
        date: deleteActionResult.createdAt as any,
        service_name: deleteActionResult.serviceName,
        target: deleteActionResult.targetId,
        action: 'DELETE',
        versionId: newVersion.id,
      } satisfies CompositeDeletedSchemaLog & {
        versionId: string;
      };
    });
  }

  async countSchemaVersionsOfProject(
    project: Project,
    period: {
      from: Date;
      to: Date;
    } | null,
  ): Promise<number> {
    if (period) {
      const result = await this.pg
        .maybeOne(
          psql`/* countPeriodSchemaVersionsOfProject */
            SELECT COUNT(*) as total FROM schema_versions as sv
            LEFT JOIN targets as t ON (t.id = sv.target_id)
            WHERE
              t.project_id = ${project.id}
              AND sv.created_at >= ${period.from.toISOString()}
              AND sv.created_at < ${period.to.toISOString()}
          `,
        )
        .then(z.object({ total: z.number() }).nullable().parse);
      return result?.total ?? 0;
    }

    const result = await this.pg
      .maybeOne(
        psql`/* countSchemaVersionsOfProject */
        SELECT COUNT(*) as total FROM schema_versions as sv
        LEFT JOIN targets as t ON (t.id = sv.target_id)
        WHERE t.project_id = ${project.id}
      `,
      )
      .then(z.object({ total: z.number() }).nullable().parse);

    return result?.total ?? 0;
  }

  async countSchemaVersionsOfTarget(
    target: Target,
    period: {
      from: Date;
      to: Date;
    } | null,
  ): Promise<number> {
    if (period) {
      const result = await this.pg
        .maybeOne(
          psql`/* countPeriodSchemaVersionsOfTarget */
            SELECT COUNT(*) as total FROM schema_versions
            WHERE
              target_id = ${target.id}
              AND created_at >= ${period.from.toISOString()}
              AND created_at < ${period.to.toISOString()}
          `,
        )
        .then(z.object({ total: z.number() }).nullable().parse);
      return result?.total ?? 0;
    }

    const result = await this.pg
      .maybeOne(
        psql`/* countSchemaVersionsOfTarget */
        SELECT COUNT(*) as total FROM schema_versions WHERE target_id = ${target.id}
      `,
      )
      .then(z.object({ total: z.number() }).nullable().parse);

    return result?.total ?? 0;
  }

  async anyVersionExistsForTarget(target: Target) {
    return this.pg.exists(
      psql`/* hasSchema */
        SELECT 1 FROM schema_versions as v WHERE v.target_id = ${target.id} LIMIT 1
      `,
    );
  }

  async getMaybeLatestValidSchemaVersion(target: Target): Promise<SchemaVersion | null> {
    const version = await this.pg.maybeOne(
      psql`/* getMaybeLatestValidVersion */
        SELECT
          ${schemaVersionSQLFields(psql`sv.`)}
        FROM schema_versions as sv
        WHERE sv.target_id = ${target.id} AND sv.is_composable IS TRUE
        ORDER BY sv.created_at DESC
        LIMIT 1
      `,
    );

    return SchemaVersionModel.nullable().parse(version);
  }

  async getLatestValidSchemaVersionForTargetId(targetId: string): Promise<SchemaVersion> {
    const version = await this.pg.maybeOne(
      psql`/* getLatestValidVersion */
        SELECT
          ${schemaVersionSQLFields(psql`sv.`)}
        FROM schema_versions as sv
        WHERE sv.target_id = ${targetId} AND sv.is_composable IS TRUE
        ORDER BY sv.created_at DESC
        LIMIT 1
      `,
    );

    return SchemaVersionModel.parse(version);
  }

  async getMaybeLatestSchemaVersionForTargetId(targetId: string): Promise<SchemaVersion | null> {
    const version = await this.pg.maybeOne(
      psql`/* getMaybeLatestVersion */
        SELECT
          ${schemaVersionSQLFields(psql`sv.`)}
        FROM
          "schema_versions" AS "sv"
        WHERE
          "sv"."target_id" = ${targetId}
        ORDER BY
          "sv"."created_at" DESC
        LIMIT 1
      `,
    );

    return SchemaVersionModel.nullable().parse(version);
  }

  async getSchemaVersionBeforeSchemaVersion(schemaVersion: SchemaVersion, onlyComposable: boolean) {
    const version = await this.pg.maybeOne(
      psql`/* getVersionBeforeVersionId */
        SELECT
          ${schemaVersionSQLFields()}
        FROM "schema_versions"
        WHERE
          "target_id" = ${schemaVersion.targetId}
          AND (
            (
              "created_at" = ${schemaVersion.createdAt}
              AND "id" < ${schemaVersion.id}
            )
            OR "created_at" < ${schemaVersion.createdAt}
          )
          ${onlyComposable ? psql`AND "is_composable" = TRUE` : psql``}
        ORDER BY
          "created_at" DESC
        LIMIT 1
      `,
    );

    return SchemaVersionModel.nullable().parse(version);
  }

  async getSchemaForSchemaVersionIdAndName(schemaVersionId: string, serviceName: string) {
    return this.pg
      .maybeOne(
        psql`/* getSchemaByNameOfVersion */
          SELECT
            ${schemaLogFields(psql`sl.`)}
            , p.type
          FROM schema_version_to_log AS svl
          LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
          LEFT JOIN projects as p ON (p.id = sl.project_id)
          WHERE
            svl.version_id = ${schemaVersionId}
            AND sl.action = 'PUSH'
            AND p.type != 'CUSTOM'
            AND lower(sl.service_name) = lower(${serviceName})
          ORDER BY
            sl.created_at DESC
        `,
      )
      .then(SchemaPushLogModel.nullable().parse);
  }

  async getSchemasBySchemaVersionId(schemaVersionId: string) {
    return this.pg
      .any(
        psql`/* getSchemasOfVersion */
          SELECT
            ${schemaLogFields(psql`sl.`)}
            , p.type
          FROM schema_version_to_log AS svl
          LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
          LEFT JOIN projects as p ON (p.id = sl.project_id)
          WHERE
            svl.version_id = ${schemaVersionId}
            AND sl.action = 'PUSH'
            AND p.type != 'CUSTOM'
          ORDER BY
            sl.created_at DESC
        `,
      )
      .then(z.array(SchemaPushLogModel).parse);
  }

  async getServiceSchemaOfVersion(schemaVersion: SchemaVersion, serviceName: string) {
    return this.pg
      .maybeOne(
        psql`/* getServiceSchemaOfVersion */
          SELECT
            ${schemaLogFields(psql`sl.`)}
            , p.type
          FROM schema_version_to_log AS svl
          LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
          LEFT JOIN projects as p ON (p.id = sl.project_id)
          WHERE
            svl.version_id = ${schemaVersion.id}
            AND sl.action = 'PUSH'
            AND p.type != 'CUSTOM'
            AND lower(sl.service_name) = lower(${serviceName})
      `,
      )
      .then(SchemaPushLogModel.nullable().parse);
  }

  async getSchemaVersionById(schemaVersionId: string) {
    const result = await this.pg.maybeOne(psql`/* getMaybeVersion */
      SELECT
        ${schemaVersionSQLFields(psql`sv.`)}
      FROM schema_versions as sv
      WHERE
        sv.id = ${schemaVersionId}
      LIMIT 1
    `);

    return SchemaVersionModel.nullable().parse(result);
  }

  async getSchemaVersionForTargetById(
    target: Target,
    schemaVersionId: string,
  ): Promise<SchemaVersion | null> {
    const schemaVersion = await this.getSchemaVersionById(schemaVersionId);

    if (schemaVersion?.targetId !== target.id) {
      return null;
    }

    return schemaVersion;
  }

  async getPaginatedSchemaVersionsForTarget(
    target: Target,
    args: {
      first: number | null;
      cursor: string | null;
    },
  ) {
    let cursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    if (args.cursor) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
    }

    const query = psql`/* getPaginatedSchemaVersionsForTargetId */
      SELECT
        ${schemaVersionSQLFields()}
      FROM
        "schema_versions"
      WHERE
        "target_id" = ${target.id}
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

    const result = await this.pg.any(query);

    let edges = result.map(row => {
      const node = SchemaVersionModel.parse(row);

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

  async getSchemaSchangesForSchemaVersion(schemaVersion: SchemaVersion) {
    const changes = await this.pg
      .any(
        psql`/* getSchemaChangesForVersion */
          SELECT
            "change_type" as "type",
            "meta",
            "severity_level" as "severityLevel",
            "is_safe_based_on_usage" as "isSafeBasedOnUsage"
          FROM
            "schema_version_changes"
          WHERE
            "schema_version_id" = ${schemaVersion.id}
    `,
      )
      .then(z.array(HiveSchemaChangeModel).parse);

    if (changes.length === 0) {
      return null;
    }

    return changes;
  }

  async getSchemaVersionForTargetByCommit(target: Target, commit: string) {
    const record = await this.pg.maybeOne(psql`/* getSchemaVersionByCommit */
      SELECT
        ${schemaVersionSQLFields()}
      FROM
        "schema_versions"
      WHERE
        "action_id" = (
          SELECT
            "id"
          FROM
            "schema_log"
          WHERE
            "schema_log"."project_id" = ${target.projectId}
            AND "schema_log"."target_id" = ${target.id}
            AND "schema_log"."commit" = ${commit}
          ORDER BY "schema_log"."created_at" DESC
          LIMIT 1
        )
      LIMIT 1
    `);

    return SchemaVersionModel.nullable().parse(record);
  }

  getSchemLog = batch<{ targetId: string; commit: string }, SchemaLog>(async selectors => {
    const rows = await this.pg.any(
      psql`/* getSchemaLog */
          SELECT
            ${schemaLogFields(psql`sl.`)}
            , p.type
          FROM schema_log as sl
          LEFT JOIN projects as p ON (p.id = sl.project_id)
          WHERE (sl.id, sl.target_id) IN ((${psql.join(
            selectors.map(s => psql`${s.commit}, ${s.targetId}`),
            psql.fragment`), (`,
          )}))
      `,
    );
    const schemas = z.array(SchemaLogModel).parse(rows);

    return selectors.map(selector => {
      const schema = schemas.find(
        row => row.id === selector.commit && row.target === selector.targetId,
      );

      if (schema) {
        return Promise.resolve(schema);
      }

      return Promise.reject(
        new Error(`Schema log not found (commit=${selector.commit}, target=${selector.targetId})`),
      );
    });
  });

  async getMatchingServiceSchemaOfVersions(versions: { before: string | null; after: string }) {
    const after = await this.pg
      .maybeOne(
        psql`/* getMatchingServiceSchemaOfVersions */
        SELECT sl.service_name, sl.sdl
        FROM schema_versions as sv
        LEFT JOIN schema_log as sl ON sv.action_id = sl.id
        WHERE sv.id = ${versions.after} AND service_name IS NOT NULL
      `,
      )
      .then(z.object({ service_name: z.string(), sdl: z.string() }).parse);

    // It's an initial version, so we just need to fetch a single version
    if (!versions.before) {
      return { serviceName: after.service_name, after: after.sdl, before: null };
    }

    const before = await this.pg
      .maybeOne(
        psql`/* getMatchingServiceSchemaOfVersions */
        SELECT sl.sdl
        FROM schema_version_to_log as svtl
        LEFT JOIN schema_log as sl ON svtl.action_id = sl.id
        WHERE svtl.version_id = ${versions.before} AND sl.service_name = ${after.service_name}
      `,
      )
      .then(z.object({ sdl: z.string().nullable() }).nullable().parse);

    return { serviceName: after.service_name, after: after.sdl, before: before?.sdl ?? null };
  }
}

const schemaVersionSQLFields = (t = psql``) => psql`
  ${t}"id"
  , ${t}"is_composable" as "isComposable"
  , to_json(${t}"created_at") as "createdAt"
  , ${t}"action_id" as "actionId"
  , ${t}"base_schema" as "baseSchema"
  , ${t}"has_persisted_schema_changes" as "hasPersistedSchemaChanges"
  , ${t}"previous_schema_version_id" as "previousSchemaVersionId"
  , ${t}"composite_schema_sdl" as "compositeSchemaSDL"
  , ${t}"supergraph_sdl" as "supergraphSDL"
  , ${t}"schema_composition_errors" as "schemaCompositionErrors"
  , ${t}"github_repository" as "githubRepository"
  , ${t}"github_sha" as "githubSha"
  , ${t}"diff_schema_version_id" as "diffSchemaVersionId"
  , ${t}"record_version" as "recordVersion"
  , ${t}"tags"
  , ${t}"has_contract_composition_errors" as "hasContractCompositionErrors"
  , ${t}"conditional_breaking_change_metadata" as "conditionalBreakingChangeMetadata"
  , ${t}"schema_metadata" as "schemaMetadata"
  , ${t}"metadata_attributes" as "metadataAttributes"
  , ${t}"target_id" as "targetId"
`;

const schemaLogFields = (prefix = psql``) => psql`
  ${prefix}"id"
  , ${prefix}"author"
  , ${prefix}"commit"
  , ${prefix}"sdl"
  , ${prefix}"created_at" AS "date"
  , ${prefix}"target_id" AS "target"
  , ${prefix}"metadata"
  , lower(${prefix}"service_name") AS "service_name"
  , ${prefix}"service_url"
  , ${prefix}"action"
`;

type CreateContractVersionInput = {
  contractId: string;
  contractName: string;
  compositeSchemaSDL: string | null;
  supergraphSDL: string | null;
  schemaCompositionErrors: Array<SchemaCompositionError> | null;
  changes: null | Array<SchemaChangeType>;
};

const SchemaLogBase = z.object({
  id: z.string(),
  date: z.number(),
  target: z.string().uuid(),
});

const SchemaPushLogBase = SchemaLogBase.extend({
  author: z.string(),
  commit: z.string(),
  sdl: z.string(),
  metadata: z.string().nullish().default(null),
});

const SinglePushSchemaLogModel = SchemaPushLogBase.extend({
  action: z.literal('PUSH'),
  type: z.literal('SINGLE'),
  service_name: z.string().nullable(),
  service_url: z.string().nullable(),
}).transform(value => ({
  ...value,
  kind: 'single' as const,
}));

export type SinglePushSchemaLog = z.TypeOf<typeof SinglePushSchemaLogModel>;

const CompositeSchemaTypeModel = z.union([z.literal('FEDERATION'), z.literal('STITCHING')]);

const CompositePushSchemaLogModel = SchemaPushLogBase.extend({
  action: z.literal('PUSH'),
  type: CompositeSchemaTypeModel,
  service_name: z.string(),
  service_url: z.string(),
}).transform(value => ({
  ...value,
  kind: 'composite' as const,
}));

export type CompositePushSchemaLog = z.TypeOf<typeof CompositePushSchemaLogModel>;

const CompositeDeletedSchemaLogModel = SchemaLogBase.extend({
  action: z.literal('DELETE'),
  service_name: z.string(),
}).transform(value => ({
  ...value,
  kind: 'composite' as const,
}));

export type CompositeDeletedSchemaLog = z.TypeOf<typeof CompositeDeletedSchemaLogModel>;

const SchemaPushLogModel = z.union([SinglePushSchemaLogModel, CompositePushSchemaLogModel]);
const SchemaLogModel = z.union([SchemaPushLogModel, CompositeDeletedSchemaLogModel]);
type SchemaLog = z.TypeOf<typeof SchemaLogModel>;

/**  This version introduced the "diffSchemaVersionId" column. */
const SchemaVersionRecordVersion_2024_01_10_Model = z.literal('2024-01-10');

const SchemaVersionRecordVersionModel = SchemaVersionRecordVersion_2024_01_10_Model;

const SchemaMetadataModel = z.object({
  name: z.string(),
  content: z.string(),
  source: z.nullable(z.string()).default(null),
});

const SchemaVersionModel = z.intersection(
  z.object({
    id: z.string(),
    isComposable: z.boolean(),
    createdAt: z.string(),
    baseSchema: z.nullable(z.string()),
    actionId: z.string(),
    hasPersistedSchemaChanges: z.nullable(z.boolean()).transform(val => val ?? false),
    previousSchemaVersionId: z.nullable(z.string()),
    diffSchemaVersionId: z.nullable(z.string()),
    compositeSchemaSDL: z.nullable(z.string()),
    supergraphSDL: z.nullable(z.string()),
    schemaCompositionErrors: z.nullable(z.array(SchemaCompositionErrorModel)),
    recordVersion: z.nullable(SchemaVersionRecordVersionModel),
    tags: z.nullable(z.array(z.string())),
    schemaMetadata: z.nullable(z.record(z.string(), z.array(SchemaMetadataModel))),
    metadataAttributes: z.nullable(z.record(z.string(), z.array(z.string()))),
    hasContractCompositionErrors: z
      .boolean()
      .nullable()
      .transform(val => val ?? false),
    conditionalBreakingChangeMetadata: ConditionalBreakingChangeMetadataModel.nullable(),
    targetId: z.string(),
  }),
  z
    .union([
      z.object({
        githubRepository: z.string(),
        githubSha: z.string(),
      }),
      z.object({
        githubRepository: z.null(),
        githubSha: z.null(),
      }),
    ])
    .transform(val => ({
      github: val.githubRepository
        ? {
            repository: val.githubRepository,
            sha: val.githubSha,
          }
        : null,
    })),
);

export type SchemaVersion = z.infer<typeof SchemaVersionModel>;
