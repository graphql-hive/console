import { Injectable, Scope } from 'graphql-modules';
import z from 'zod';
import { batch } from '@hive/api/shared/helpers';
import { isUUID } from '@hive/api/shared/is-uuid';
import { CommonQueryMethods, PostgresDatabasePool, psql } from '@hive/postgres';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
  HiveSchemaChangeModel,
  SchemaChangeType,
  SchemaCompositionError,
  SchemaCompositionErrorModel,
  toSerializableSchemaChange,
} from '@hive/storage';
import type { Target } from '../../../shared/entities';
import { Logger } from '../../shared/providers/logger';

export const GraphVariantNameModel = z
  .string()
  .min(3, 'Must be at least 3 character long.')
  .max(64, 'Must be at most 64 characters long.')
  .regex(/^[a-zA-Z0-9_-]+$/, "Can only contain letters, numbers, '_', and '-'.");

@Injectable({
  scope: Scope.Operation,
})
export class GraphVariants {
  private logger: Logger;

  constructor(
    logger: Logger,
    private pg: PostgresDatabasePool,
  ) {
    this.logger = logger.child({ service: 'GraphVariants' });
  }

  async getActiveGraphVariantsForTarget(target: Target) {
    const query = psql`
      SELECT
        ${graphVariantFields}
      FROM
        "graph_variants"
      WHERE
        "target_id" = ${target.id}
        AND "retired_at" IS NULL
    `;

    const result = await this.pg.any(query);

    return result.map(record => ActiveGraphVariantModel.parse(record));
  }

  async getGraphVariantForGraphVariantVersion(graphVariantVersion: GraphVariantVersion) {
    const query = psql`
      SELECT
        ${graphVariantFields}
      FROM
        "graph_variants"
      WHERE
        "id" = ${graphVariantVersion.graphVariantId}
      LIMIT 1
    `;

    const graphVariant = await this.pg.maybeOne(query).then(GraphVariantModel.nullable().parse);
    return graphVariant;
  }

  async getGraphVariantForTargetByName(target: Target, variantName: string) {
    const query = psql`
      SELECT
        ${graphVariantFields}
      FROM
        "graph_variants"
      WHERE
        "target_id" = ${target.id}
        AND "name" = ${variantName}
      LIMIT 1
    `;

    const graphVariant = await this.pg.maybeOne(query).then(GraphVariantModel.nullable().parse);
    return graphVariant;
  }

  async getGraphVariantForTargetById(target: Target, graphVariantId: string) {
    if (!isUUID(graphVariantId)) {
      return null;
    }

    const query = psql`
      SELECT
        ${graphVariantFields}
      FROM
        "graph_variants"
      WHERE
        "id" = ${graphVariantId}
        AND "target_id" = ${target.id}
      LIMIT 1
    `;
    return await this.pg.maybeOne(query).then(GraphVariantModel.nullable().parse);
  }

  async getGraphVariantsForTarget(
    target: Target,
    args: {
      first: number | null;
      cursor: string | null;
    },
  ) {
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;
    const cursor = args.cursor ? decodeCreatedAtAndUUIDIdBasedCursor(args.cursor) : null;

    const query = psql`
      SELECT
        ${graphVariantFields}
      FROM
        "graph_variants"
      WHERE
        "target_id" = ${target.id}
      LIMIT ${limit + 1}
    `;

    const result = await this.pg.any(query);

    let items = result.map(row => {
      const node = GraphVariantModel.parse(row);

      return {
        cursor: encodeCreatedAtAndUUIDIdBasedCursor(node),
        node,
      };
    });

    const hasNextPage = items.length > limit;

    items = items.slice(0, limit);

    return {
      edges: items,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        endCursor: items[items.length - 1]?.cursor ?? '',
        startCursor: items[0]?.cursor ?? '',
      },
    };
  }

  getLatestGraphVariantVersion = batch<GraphVariant, GraphVariantVersion | null>(
    async graphVariants => {
      const ids = graphVariants.map(version => version.id);

      const query = psql`
        SELECT DISTINCT ON ("graph_variant_id")
          ${graphVariantVersionFields}
        FROM
          "graph_variant_versions"
        WHERE
          "graph_variant_id" = ANY(${psql.array(ids, 'uuid')})
        ORDER BY
          "graph_variant_id"
          , "created_at" DESC
      `;

      const result = await this.pg.any(query);
      const mapping = new Map</** graph_variant_id */ string, GraphVariantVersion>();
      for (const rawRecord of result) {
        const graphVersion = GraphVariantVersionModel.parse(rawRecord);
        mapping.set(graphVersion.graphVariantId, graphVersion);
      }

      return ids.map(async id => mapping.get(id) ?? null);
    },
  );

  async getLatestGraphVariantVersionWithLogs(
    graphVariant: GraphVariant,
  ): Promise<{ version: GraphVariantVersion; logs: Array<ServiceSchemaPushLog> } | null> {
    const version = await this.getLatestGraphVariantVersion(graphVariant);
    if (!version) {
      return null;
    }

    return {
      version,
      logs: await this.getSchemaLogsForGraphVersion(version),
    };
  }

  getLatestComposableGraphVariantVersion = batch<
    GraphVariant,
    ComposableGraphVariantVersion | null
  >(async graphVariants => {
    const ids = graphVariants.map(version => version.id);

    const query = psql`
        SELECT DISTINCT ON ("graph_variant_id")
          ${graphVariantVersionFields}
        FROM
          "graph_variant_versions"
        WHERE
          "graph_variant_id" = ANY(${psql.array(ids, 'uuid')})
          AND "schema_composition_errors" IS NULL
        ORDER BY
          "graph_variant_id"
          , "created_at" DESC
      `;

    const result = await this.pg.any(query);
    const mapping = new Map</** graph_variant_id */ string, ComposableGraphVariantVersion>();
    for (const rawRecord of result) {
      const graphVersion = ComposableGraphVariantVersionModel.parse(rawRecord);
      mapping.set(graphVersion.graphVariantId, graphVersion);
    }

    return ids.map(async id => mapping.get(id) ?? null);
  });

  async getLatestComposableGraphVariantVersionWithLogs(
    graphVariant: GraphVariant,
  ): Promise<{ version: ComposableGraphVariantVersion; logs: Array<ServiceSchemaPushLog> } | null> {
    const version = await this.getLatestComposableGraphVariantVersion(graphVariant);
    if (!version) {
      return null;
    }

    return {
      version,
      logs: await this.getSchemaLogsForGraphVersion(version),
    };
  }

  async getSchemaLogsByIds(schemaLogIds: Array<string>) {
    const schemaLogsQuery = psql`
      SELECT
        ${schemaLogFields}
      FROM
        "schema_log"
      WHERE
        "id" = ANY(${psql.array(schemaLogIds, 'uuid')})
        AND "action" = 'PUSH'
    `;

    return await this.pg.any(schemaLogsQuery).then(z.array(ServiceSchemaPushLogModel).parse);
  }

  getSchemaLogsForGraphVersion = batch<GraphVariantVersion, Array<ServiceSchemaPushLog>>(
    async graphVariantVersions => {
      const graphVariantVersionIds = graphVariantVersions.map(version => version.id);

      /**
       * To improve performance, we fetch schema logs in a separate query instead of joining
       * the `graph_variant_versions` and `schema_log` tables directly.
       *
       * A single graph variant version is composed of schemas from multiple services (schema logs).
       * A direct JOIN would duplicate the version's data for each service it includes.
       *
       * By using two distinct queries, we reduce redundant data transfer from the database,
       * saving network bandwidth and application memory.
       */

      const graphVariantsToVersionLogQuery = psql`
        SELECT
          ${graphVariantsVersionToLogFields}
        FROM
          "graph_variants_version_to_log"
        WHERE
          "graph_variant_version_id" = ANY(${psql.array(graphVariantVersionIds, 'uuid')})
      `;

      const result = await this.pg.any(graphVariantsToVersionLogQuery);
      const allSchemaLogIds = new Set<string>();
      const schemaLogIdsByGraphVariantVersionId = new Map<
        /* graphVariantVersionId */ string,
        /* schema_log ids */ Set<string>
      >();

      for (const rawRecord of result) {
        const record = GraphVariantsToLogModel.parse(rawRecord);
        allSchemaLogIds.add(record.schemaLogId);
        let schemaLogIds = schemaLogIdsByGraphVariantVersionId.get(record.graphVariantVersionId);
        if (!schemaLogIds) {
          schemaLogIds = new Set();
          schemaLogIdsByGraphVariantVersionId.set(record.graphVariantVersionId, schemaLogIds);
        }
        schemaLogIds.add(record.schemaLogId);
      }

      const schemaLogsQuery = psql`
        SELECT
          ${schemaLogFields}
        FROM
          "schema_log"
        WHERE
          "id" = ANY(${psql.array(Array.from(allSchemaLogIds), 'uuid')})
      `;

      const schemaLogsResult = await this.pg.any(schemaLogsQuery);
      const schemaLogsById = new Map</** schema_log_id */ string, ServiceSchemaLog>();
      for (const rawRecord of schemaLogsResult) {
        const record = ServiceSchemaLogModel.parse(rawRecord);
        schemaLogsById.set(record.id, record);
      }

      return graphVariantVersionIds.map(async graphVariantVersionId => {
        const schemaLogIds = schemaLogIdsByGraphVariantVersionId.get(graphVariantVersionId);

        if (schemaLogIds === undefined) {
          throw new Error(
            'Inconcistent state detected.' +
              `\nNo schema logs where retrieved for graph variant version '${graphVariantVersionId}'.`,
          );
        }
        const pushRecords: Array<ServiceSchemaPushLog> = [];
        for (const id of schemaLogIds) {
          const record = schemaLogsById.get(id);

          if (record === undefined) {
            throw new Error(
              'Inconcistent state detected.' +
                `\nSchema log with id '${id}' was never retrieved for graph variant version '${graphVariantVersionId}'.`,
            );
          }

          if (record.action === 'DELETE') {
            continue;
          }

          pushRecords.push(record);
        }

        return pushRecords;
      });
    },
  );

  async getGraphVariantVersionToLogsForGraphVariantVersion(version: GraphVariantVersion) {
    const graphVariantsToVersionLogQuery = psql`
      SELECT
        ${graphVariantsVersionToLogFields}
      FROM
        "graph_variants_version_to_log"
      WHERE
        "graph_variant_version_id" = ${version.id}
    `;

    return await this.pg
      .any(graphVariantsToVersionLogQuery)
      .then(z.array(GraphVariantsToLogModel).parse);
  }

  async promoteGraphVariantVersionToGraphVariant(args: {
    /** Where is this version promoted to? */
    target: {
      graph: GraphVariant;
      version: GraphVariantVersion;
    };
    /** From where is this version promoted? */
    origin: {
      graph: GraphVariant;
      version: GraphVariantVersion;
    };
    deleteLogs: Array<{ id: string; serviceName: string; targetId: string; projectId: string }>;
    newLogEdges: Array<{
      logId: string;
      previousLogId: string | null;
      changes: Array<SchemaChangeType> | null;
    }>;
    publicSchemaChanges: Array<SchemaChangeType> | null;
    supergraphSchemaChanges: Array<SchemaChangeType> | null;
  }) {
    return await this.pg.transaction('promoteGraphVariantVersionToGraphVariant', async pg => {
      // create graph version
      const version = await this._createGraphVariantVersion(
        {
          graphVariantId: args.target.graph.id,
          origin: {
            type: 'graphVersionPromotion',
            sourceGraphName: args.origin.graph.name,
            sourceGraphVersionId: args.origin.version.id,
          },
          supergraphSdl: args.origin.version.supergraphSdl,
          publicSchemaSdl: args.origin.version.publicSdl,
          schemaCompositionErrors: args.origin.version.schemaCompositionErrors,
          previousGraphVersionId: args.target.version.id,
          publicSchemaChanges: args.publicSchemaChanges,
          supergraphSchemaChanges: args.supergraphSchemaChanges,
        },
        pg,
      );

      // insert new delete schema logs if needed
      if (args.deleteLogs.length) {
        const query = psql`
          INSERT INTO "schema_log" (
            "id"
            , "project_id"
            , "target_id"
            , "author"
            , "commit"
            , "service_name"
            , "action"
          )
          SELECT * FROM ${psql.unnest(
            args.deleteLogs.map(log => [
              log.id,
              log.projectId,
              log.targetId,
              'PLACEHOLDER',
              'PLACEHOLDER',
              log.serviceName,
              'DELETE',
            ]),
            ['uuid', 'uuid', 'uuid', 'text', 'text', 'text', 'text'],
          )}
        `;

        await pg.query(query);
      }

      // insert new edges
      const graphVariantSchemaLogsQuery = psql`
        INSERT INTO "graph_variants_version_to_log" (
          "graph_variant_version_id"
          , "schema_log_id"
          , "previous_schema_log_id"
          , "previous_schema_log_changes"
        )
        SELECT * FROM
          ${psql.unnest(
            args.newLogEdges.map(
              // These are all unchanged (for now; this might change later if we allow publishing musltiple services at the same time or delete a service)
              edge =>
                [
                  version.id,
                  edge.logId,
                  edge.previousLogId,
                  JSON.stringify(edge.changes?.map(toSerializableSchemaChange) ?? null),
                ] as const,
            ),
            ['uuid', 'uuid', 'uuid', 'jsonb'],
          )}
      `;

      await pg.query(graphVariantSchemaLogsQuery);
      return version;
    });
  }

  async getSubgraphDiffForGraphVariantVersion(version: GraphVariantVersion) {
    const edges = await this.getGraphVariantVersionToLogsForGraphVariantVersion(version);

    const allLogIds = new Set<string>();
    for (const edge of edges) {
      allLogIds.add(edge.schemaLogId);
      if (edge.previousSchemaLogId) {
        allLogIds.add(edge.previousSchemaLogId);
      }
    }

    const schemaLogsQuery = psql`
      SELECT
        ${schemaLogFields}
      FROM
        "schema_log"
      WHERE
        "id" = ANY(${psql.array(Array.from(allLogIds), 'uuid')})
    `;

    const nodes = await this.pg.any(schemaLogsQuery).then(z.array(ServiceSchemaLogModel).parse);
    const map = new Map<string, ServiceSchemaLog>();
    for (const node of nodes) {
      map.set(node.id, node);
    }

    const subgraphDiffs: Array<
      | {
          type: 'unchanged';
          log: ServiceSchemaPushLog;
        }
      | {
          type: 'removed';
          log: ServiceSchemaRemoveLog;
          previousLog: ServiceSchemaPushLog;
        }
      | {
          type: 'added';
          log: ServiceSchemaPushLog;
        }
      | {
          type: 'changed';
          log: ServiceSchemaPushLog;
          previousLog: ServiceSchemaPushLog;
          changes: Array<SchemaChangeType> | null;
        }
    > = [];

    for (const edge of edges) {
      const node = map.get(edge.schemaLogId);
      const previousNode = edge.previousSchemaLogId ? map.get(edge.previousSchemaLogId) : null;

      if (!node) {
        throw new Error('Something went wrong. Could not find node for edge.');
      }

      if (node.action === 'DELETE') {
        if (edge.previousSchemaLogId === edge.schemaLogId) {
          throw new Error(
            'This should not happen. A deleted schema log is never copied to the follow up graph version.',
          );
        }
        if (!previousNode) {
          throw new Error(
            'This should not happen. A removed log should always have a previous version.',
          );
        }

        if (previousNode.action !== 'PUSH') {
          throw new Error(
            'This should not happen. A removed log should always have a previous push version.',
          );
        }

        subgraphDiffs.push({
          type: 'removed',
          log: node,
          previousLog: previousNode,
        });
        continue;
      }

      // PUSH
      if (!edge.previousSchemaLogId) {
        subgraphDiffs.push({
          type: 'added',
          log: node,
        });
        continue;
      }

      if (edge.schemaLogId === edge.previousSchemaLogId) {
        subgraphDiffs.push({
          type: 'unchanged' as const,
          log: node,
        });
        continue;
      }

      if (!previousNode) {
        throw new Error('This should not happen. The previous schema log must be available.');
      }

      if (previousNode.action !== 'PUSH') {
        throw new Error(
          'This should not happen. A push log should always have a previous push version.',
        );
      }

      subgraphDiffs.push({
        type: 'changed' as const,
        log: node,
        previousLog: previousNode,
        changes: edge.previousSchemaLogChanges,
      });
    }

    return subgraphDiffs;
  }

  private async createSchemaLog(args: CreateSchemaLogInput, pg: CommonQueryMethods) {
    const query = psql`
      INSERT INTO "schema_log" (
        "project_id"
        , "target_id"
        , "author"
        , "commit"
        , "service_name"
        , "service_url"
        , "sdl"
      )
      VALUES (
        ${args.projectId}
        , ${args.targetId}
        , ${args.author}
        , ${args.commit}
        , ${args.serviceName}
        , ${args.serviceUrl}
        , ${args.sdl}
      )
      RETURNING
        ${schemaLogFields}
    `;

    return await pg.one(query).then(ServiceSchemaPushLogModel.parse);
  }

  private async createGraphVariant(
    args: {
      name: string;
      targetId: string;
    },
    pg: CommonQueryMethods,
  ) {
    const query = psql`
      INSERT INTO "graph_variants" (
        "target_id"
        , "name"
      ) VALUES (
        ${args.targetId}
        , ${args.name}
      )
      RETURNING
        ${graphVariantFields}
    `;

    return await pg.one(query).then(GraphVariantModel.parse);
  }

  private async _createGraphVariantVersion(
    args: {
      graphVariantId: string;
      schemaCompositionErrors: null | Array<SchemaCompositionError>;
      supergraphSdl: string | null;
      publicSchemaSdl: string | null;
      publicSchemaChanges: Array<SchemaChangeType> | null;
      supergraphSchemaChanges: Array<SchemaChangeType> | null;
      previousGraphVersionId: null | string;
      origin:
        | GraphVariantVersionOriginGraphVersionPromotion
        | GraphVariantVersionOriginSubgraphPublish;
    },
    pg: CommonQueryMethods,
  ) {
    const graphVariantVersionQuery = psql`
      INSERT INTO "graph_variant_versions" (
        "graph_variant_id"
        , "schema_composition_errors"
        , "supergraph_sdl"
        , "supergraph_schema_changes"
        , "public_sdl"
        , "public_schema_changes"
        , "previous_graph_variant_version_id"
        , "origin"
      )
      VALUES (
        ${args.graphVariantId}
        , ${args.schemaCompositionErrors ? psql.jsonb(args.schemaCompositionErrors) : null}
        , ${args.supergraphSdl}
        , ${args.supergraphSchemaChanges ? psql.jsonb(args.supergraphSchemaChanges.map(toSerializableSchemaChange)) : null}
        , ${args.publicSchemaSdl}
        , ${args.publicSchemaChanges ? psql.jsonb(args.publicSchemaChanges.map(toSerializableSchemaChange)) : null}
        , ${args.previousGraphVersionId}
        , ${psql.jsonb(GraphVariantVersionOriginModel.parse(args.origin))}
      )
      RETURNING
        ${graphVariantVersionFields}
    `;

    return await pg.one(graphVariantVersionQuery).then(GraphVariantVersionModel.parse);
  }

  async createInitialClonedGraphVariantVersion(args: {
    targetId: string;
    graphVariantName: string;
    schemaLogIds: Array<string>;
    supergraphSdl: string | null;
    publicSchemaSdl: string | null;
    schemaCompositionErrors: null | Array<SchemaCompositionError>;
    origin: {
      sourceGraphName: string;
      sourceGraphVersionId: string;
    };
  }) {
    return await this.pg.transaction('createInitialClonedGraphVariantVersion', async pg => {
      const graphVariant = await this.createGraphVariant(
        { name: args.graphVariantName, targetId: args.targetId },
        pg,
      );

      const graphVariantVersion = await this._createGraphVariantVersion(
        {
          graphVariantId: graphVariant.id,
          schemaCompositionErrors: args.schemaCompositionErrors,
          supergraphSdl: args.supergraphSdl,
          publicSchemaSdl: args.publicSchemaSdl,
          publicSchemaChanges: null,
          supergraphSchemaChanges: null,
          previousGraphVersionId: null,
          origin: {
            type: 'graphVersionPromotion',
            sourceGraphName: args.origin.sourceGraphName,
            sourceGraphVersionId: args.origin.sourceGraphVersionId,
          },
        },
        pg,
      );

      const graphVariantSchemaLogsQuery = psql`
        INSERT INTO "graph_variants_version_to_log" (
          "graph_variant_version_id"
          , "schema_log_id"
          , "previous_schema_log_id"
        )
        SELECT * FROM
          ${psql.unnest(
            args.schemaLogIds.map(
              // These are all unchanged (for now; this might change later if we allow publishing musltiple services at the same time or delete a service)
              actionId => [graphVariantVersion.id, actionId, actionId] as const,
            ),
            ['uuid', 'uuid', 'uuid'],
          )}
      `;

      await pg.query(graphVariantSchemaLogsQuery);
      return { graphVariant, graphVariantVersion };
    });
  }

  async deleteGraphVariant(args: { targetId: string; graphVariantId: string }) {
    await this.pg.query(psql`
      DELETE FROM "graph_variants"
      WHERE
        "target_id" = ${args.targetId}
        AND "id" = ${args.graphVariantId}
    `);
  }

  async createSubgraphPublishGraphVariantVersion(
    args: {
      graphVariant: {
        graphVariant: GraphVariant;
        previousVersion: GraphVariantVersion | null;
        diffVersion: GraphVariantVersion | null;
      };
      schemaLog:
        | { type: 'exists'; id: string; serviceName: string }
        | { type: 'doesNotExist'; input: CreateSchemaLogInput };
      /** The ID of the previous schema log (against which we diffed). The previous schema log must always be a PUSH log. */
      previousSchemaLogId: string | null;
      schemaCompositionErrors: null | Array<SchemaCompositionError>;
      supergraphSdl: string | null;
      compositeSchemaSdl: string | null;
      publicSchemaChanges: Array<SchemaChangeType> | null;
      supergraphSchemaChanges: Array<SchemaChangeType> | null;
      serviceChanges: Array<SchemaChangeType> | null;
      schemaLogIds: Array<string>;
    },
    // TODO: this should all be within a single transaction
    pg: CommonQueryMethods = this.pg,
  ) {
    return await this.pg.transaction('createSubgraphPublishGraphVariantVersion', async pg => {
      const schemaLog =
        args.schemaLog.type === 'exists'
          ? args.schemaLog
          : await this.createSchemaLog(args.schemaLog.input, pg);
      const graphVariant = args.graphVariant.graphVariant;

      const version = await this._createGraphVariantVersion(
        {
          graphVariantId: graphVariant.id,
          schemaCompositionErrors: args.schemaCompositionErrors,
          supergraphSdl: args.supergraphSdl,
          publicSchemaSdl: args.compositeSchemaSdl,
          publicSchemaChanges: args.publicSchemaChanges,
          supergraphSchemaChanges: args.supergraphSchemaChanges,
          previousGraphVersionId: args.graphVariant.diffVersion?.id ?? null,
          origin: {
            type: 'subgraphPublish',
            subgraphs: [
              {
                name: schemaLog.serviceName,
                versionId: schemaLog.id,
              },
            ],
          },
        },
        pg,
      );

      const graphVariantSchemaLogsQuery = psql`
        INSERT INTO "graph_variants_version_to_log" (
          "graph_variant_version_id"
          , "schema_log_id"
          , "previous_schema_log_id"
        )
        SELECT * FROM
          ${psql.unnest(
            args.schemaLogIds.map(
              // These are all unchanged (for now; this might change later if we allow publishing musltiple services at the same time or delete a service)
              actionId => [version.id, actionId, actionId] as const,
            ),
            ['uuid', 'uuid', 'uuid'],
          )}
      `;

      await pg.query(graphVariantSchemaLogsQuery);

      await pg.query(psql`
        INSERT INTO "graph_variants_version_to_log" (
          "graph_variant_version_id"
          , "schema_log_id"
          , "previous_schema_log_id"
          , "previous_schema_log_changes"
        )
        VALUES (
          ${version.id}
          , ${schemaLog.id}
          , ${args.previousSchemaLogId}
          , ${
            args.serviceChanges
              ? psql.jsonb(args.serviceChanges.map(toSerializableSchemaChange))
              : null
          }
        )
      `);

      return version;
    });
  }

  async getPaginatedGraphVariantVersionsForGraphVariant(
    graphVariant: GraphVariant,
    args: { after: string | null; first: number },
  ) {
    let afterCursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    if (args.after) {
      afterCursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }

    const query = psql`/* getPaginatedGraphVariantVersionsForTarget */
      SELECT
        ${graphVariantVersionFields}
      FROM
        "graph_variant_versions"
      WHERE
        "graph_variant_id" = ${graphVariant.id}
        ${
          afterCursor
            ? psql`
              AND (
                (
                  "created_at" = ${afterCursor.createdAt}
                  AND "id" < ${afterCursor.id}
                )
                OR "created_at" < ${afterCursor.createdAt}
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
      const node = GraphVariantVersionModel.parse(row);

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
        hasPreviousPage: afterCursor !== null,
        get endCursor() {
          return edges[edges.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return edges[0]?.cursor ?? '';
        },
      },
    };
  }

  async getGraphVariantVersionById(graphVariantVersionId: string) {
    if (!isUUID(graphVariantVersionId)) {
      return null;
    }

    const query = psql`
      SELECT
        ${graphVariantVersionFields}
      FROM
        "graph_variant_versions"
      WHERE
        "id" = ${graphVariantVersionId}
      LIMIT 1
    `;

    return await this.pg.maybeOne(query).then(GraphVariantVersionModel.nullable().parse);
  }

  async getGraphVariantVersionByIdForGraphVariant(
    graphVariant: GraphVariant,
    graphVariantVersionId: string,
  ) {
    const version = await this.getGraphVariantVersionById(graphVariantVersionId);

    if (!version) {
      return null;
    }

    if (version.graphVariantId !== graphVariant.id) {
      return null;
    }

    return version;
  }

  async getPreviousDiffableGraphVersionForGraphVersion(graphVariant: GraphVariantVersion) {
    if (!graphVariant.previousGraphVariantVersionId) {
      return null;
    }

    const graphVersion = await this.getGraphVariantVersionById(
      graphVariant.previousGraphVariantVersionId,
    );

    return graphVersion;
  }
}

type CreateSchemaLogInput = {
  projectId: string;
  targetId: string;
  author: string;
  serviceName: string;
  serviceUrl: string;
  sdl: string;
  commit: string;
};
const graphVariantFields = psql`
  "id"
  , "target_id" AS "targetId"
  , "name"
  , to_json("created_at") AS "createdAt"
  , to_json("retired_at") AS "retiredAt"
`;

const SharedGraphVariantModel = z.object({
  id: z.string(),
  targetId: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

const ActiveGraphVariantModel = z.intersection(
  SharedGraphVariantModel,
  z.object({
    retiredAt: z.null(),
  }),
);

export type ActiveGraphVariant = z.TypeOf<typeof ActiveGraphVariantModel>;

const RetiredGraphVariantModel = z.intersection(
  SharedGraphVariantModel,
  z.object({
    retiredAt: z.string(),
  }),
);

const GraphVariantModel = z.union([ActiveGraphVariantModel, RetiredGraphVariantModel]);

export type GraphVariant = z.TypeOf<typeof GraphVariantModel>;

const graphVariantVersionFields = psql`
  "id"
  , "graph_variant_id" AS "graphVariantId"
  , "previous_graph_variant_version_id" AS "previousGraphVariantVersionId"
  , to_json("created_at") AS "createdAt"
  , "schema_composition_errors" AS "schemaCompositionErrors"
  , "public_sdl" AS "publicSdl"
  , "public_schema_changes" AS "publicSchemaChanges"
  , "supergraph_sdl" AS "supergraphSdl"
  , "supergraph_schema_changes" AS "supergraphSchemaChanges"
  , "origin"
`;

const GraphVariantVersionOriginGraphVersionPromotionModel = z.object({
  type: z.literal('graphVersionPromotion'),
  sourceGraphName: z.string(),
  sourceGraphVersionId: z.string(),
  // todo: maybe also tarck the target here
});

type GraphVariantVersionOriginGraphVersionPromotion = z.TypeOf<
  typeof GraphVariantVersionOriginGraphVersionPromotionModel
>;

const GraphVariantVersionOriginSubgraphPublishModel = z.object({
  type: z.literal('subgraphPublish'),
  subgraphs: z.array(
    z.object({
      name: z.string(),
      versionId: z.string(),
    }),
  ),
});

type GraphVariantVersionOriginSubgraphPublish = z.TypeOf<
  typeof GraphVariantVersionOriginSubgraphPublishModel
>;

const GraphVariantVersionOriginModel = z.union([
  GraphVariantVersionOriginGraphVersionPromotionModel,
  GraphVariantVersionOriginSubgraphPublishModel,
]);

const SharedGraphVariantVersionFieldsModel = z.object({
  id: z.string(),
  graphVariantId: z.string(),
  previousGraphVariantVersionId: z.string().nullable(),
  createdAt: z.string(),
  origin: GraphVariantVersionOriginModel,
});

const ComposableGraphVariantVersionModel = z.intersection(
  SharedGraphVariantVersionFieldsModel,
  z.object({
    schemaCompositionErrors: z.null(),
    publicSdl: z.string(),
    supergraphSdl: z.string(),
    supergraphSchemaChanges: z.array(HiveSchemaChangeModel).nullable(),
    publicSchemaChanges: z.array(HiveSchemaChangeModel).nullable(),
  }),
);

export type ComposableGraphVariantVersion = z.TypeOf<typeof ComposableGraphVariantVersionModel>;

const UncomposableGraphVariantVersionModel = z.intersection(
  SharedGraphVariantVersionFieldsModel,
  z.object({
    schemaCompositionErrors: z.array(SchemaCompositionErrorModel),
    publicSdl: z.null(),
    publicSchemaChanges: z.null(),
    supergraphSdl: z.null(),
    supergraphSchemaChanges: z.null(),
  }),
);

const GraphVariantVersionModel = z.union([
  ComposableGraphVariantVersionModel,
  UncomposableGraphVariantVersionModel,
]);

export type GraphVariantVersion = z.TypeOf<typeof GraphVariantVersionModel>;

const graphVariantsVersionToLogFields = psql`
  "graph_variant_version_id" AS "graphVariantVersionId"
  , "schema_log_id" AS "schemaLogId"
  , "previous_schema_log_id" AS "previousSchemaLogId"
  , "previous_schema_log_changes" AS "previousSchemaLogChanges"
`;

const GraphVariantsToLogBaseModel = z.object({
  graphVariantVersionId: z.string(),
  schemaLogId: z.string(),
});

const GraphVariantsToLogNoPreviousLogModel = GraphVariantsToLogBaseModel.extend({
  previousSchemaLogId: z.null(),
  previousSchemaLogChanges: z.null(),
});

const GraphVariantsToLogPreviousLogModel = GraphVariantsToLogBaseModel.extend({
  previousSchemaLogId: z.string(),
  previousSchemaLogChanges: z.array(HiveSchemaChangeModel).nullable(),
});

const GraphVariantsToLogModel = z.union([
  GraphVariantsToLogNoPreviousLogModel,
  GraphVariantsToLogPreviousLogModel,
]);

const schemaLogFields = psql`
  "id"
  ,  to_json("created_at") AS "createdAt"
  , "service_name" AS "serviceName"
  , "service_url" AS "serviceUrl"
  , "sdl"
  , "action"
`;

/** Schema log that is a "PUSH" aka not a removal etc. */
const ServiceSchemaPushLogModel = z.object({
  id: z.string(),
  createdAt: z.string(),
  serviceName: z.string(),
  serviceUrl: z.string(),
  sdl: z.string(),
  action: z.literal('PUSH'),
});

const ServiceSchemaRemoveLogModel = z.object({
  id: z.string(),
  createdAt: z.string(),
  serviceName: z.string(),
  serviceUrl: z.null(),
  sdl: z.null(),
  action: z.literal('DELETE'),
});

const ServiceSchemaLogModel = z.union([ServiceSchemaPushLogModel, ServiceSchemaRemoveLogModel]);

export type ServiceSchemaPushLog = z.TypeOf<typeof ServiceSchemaPushLogModel>;
type ServiceSchemaRemoveLog = z.TypeOf<typeof ServiceSchemaRemoveLogModel>;

type ServiceSchemaLog = z.TypeOf<typeof ServiceSchemaLogModel>;
