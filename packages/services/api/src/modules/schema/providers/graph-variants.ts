import { Injectable, Scope } from 'graphql-modules';
import z from 'zod';
import { batch } from '@hive/api/shared/helpers';
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

  // async getActiveGraphVariantsForTargetWithLatestVersions

  // TODO: probably remove pagination.
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
          AND "action" = 'PUSH'
      `;

      const schemaLogsResult = await this.pg.any(schemaLogsQuery);
      const schemaLogsById = new Map</** schema_log_id */ string, ServiceSchemaPushLog>();
      for (const rawRecord of schemaLogsResult) {
        const record = ServiceSchemaPushLogModel.parse(rawRecord);
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

        return Array.from(schemaLogIds).map(schemaLogId => {
          const record = schemaLogsById.get(schemaLogId);

          if (record === undefined) {
            throw new Error(
              'Inconcistent state detected.' +
                `\nSchema log with id '${schemaLogId}' was never retrieved for graph variant version '${graphVariantVersionId}'.`,
            );
          }

          return record;
        });
      });
    },
  );

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
    args: { name: string; targetId: string },
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

  async createGraphVariantVersion(
    args: {
      graphVariant:
        | { type: 'exists'; value: GraphVariant }
        | { type: 'doesNotExist'; name: string; targetId: string };
      schemaLog:
        | { type: 'exists'; id: string }
        | { type: 'doesNotExist'; input: CreateSchemaLogInput };
      schemaCompositionErrors: null | Array<SchemaCompositionError>;
      supergraphSdl: string | null;
      compositeSchemaSdl: string | null;
      schemaChanges: Array<SchemaChangeType> | null;
      schemaLogIds: Array<string>;
    },
    // TODO: this should all be within a single transaction
    pg: CommonQueryMethods = this.pg,
  ) {
    const newSchemaLogId =
      args.schemaLog.type === 'exists'
        ? args.schemaLog.id
        : (await this.createSchemaLog(args.schemaLog.input, pg)).id;

    const graphVariant =
      args.graphVariant.type === 'exists'
        ? args.graphVariant.value
        : await this.createGraphVariant(
            {
              name: args.graphVariant.name,
              targetId: args.graphVariant.targetId,
            },
            pg,
          );

    const graphVariantVersionQuery = psql`
      INSERT INTO "graph_variant_versions" (
        "graph_variant_id"
        , "schema_log_id"
        , "schema_composition_errors"
        , "supergraph_sdl"
        , "compositite_schema_sdl"
        , "schema_changes"
      )
      VALUES (
        ${graphVariant.id}
        , ${newSchemaLogId}
        , ${args.schemaCompositionErrors ? psql.jsonb(args.schemaCompositionErrors) : null}
        , ${args.supergraphSdl}
        , ${args.compositeSchemaSdl}
        , ${args.schemaChanges ? psql.jsonb(args.schemaChanges.map(toSerializableSchemaChange)) : null}
      )
      RETURNING
        ${graphVariantVersionFields}
    `;

    const version = await pg.one(graphVariantVersionQuery).then(GraphVariantVersionModel.parse);

    let schemaLogsIds = args.schemaLogIds;

    if (newSchemaLogId) {
      schemaLogsIds = schemaLogsIds.concat(newSchemaLogId);
    }

    const graphVariantSchemaLogsQuery = psql`
      INSERT INTO "graph_variants_version_to_log" (
        "graph_variant_version_id"
        , "schema_log_id"
      )
      SELECT * FROM
        ${psql.unnest(
          schemaLogsIds.map(actionId => [version.id, actionId]),
          ['uuid', 'uuid'],
        )}
    `;

    await pg.query(graphVariantSchemaLogsQuery);
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
  , "schema_log_id" AS "schemaLogId"
  , "schema_composition_errors" AS "schemaCompositionErrors"
  , "compositite_schema_sdl" AS "compositeSchemaSdl"
  , "supergraph_sdl" AS "supergraphSdl"
  , "schema_changes" AS "schemaChanges"
`;

const SharedGraphVariantVersionFieldsModel = z.object({
  id: z.string(),
  graphVariantId: z.string(),
  previousGraphVariantVersionId: z.string().nullable(),
  createdAt: z.string(),
  schemaLogId: z.string(),
});

const ComposableGraphVariantVersionModel = z.intersection(
  SharedGraphVariantVersionFieldsModel,
  z.object({
    schemaCompositionErrors: z.null(),
    compositeSchemaSdl: z.string(),
    supergraphSdl: z.string(),
    schemaChanges: z.array(HiveSchemaChangeModel).nullable(),
  }),
);

type ComposableGraphVariantVersion = z.TypeOf<typeof ComposableGraphVariantVersionModel>;

const UncomposableGraphVariantVersionModel = z.intersection(
  SharedGraphVariantVersionFieldsModel,
  z.object({
    schemaCompositionErrors: z.array(SchemaCompositionErrorModel),
    compositeSchemaSdl: z.null(),
    supergraphSdl: z.null(),
    schemaChanges: z.null(),
  }),
);

const GraphVariantVersionModel = z.union([
  ComposableGraphVariantVersionModel,
  UncomposableGraphVariantVersionModel,
]);

type GraphVariantVersion = z.TypeOf<typeof GraphVariantVersionModel>;

const graphVariantsVersionToLogFields = psql`
  "graph_variant_version_id" AS "graphVariantVersionId"
  , "schema_log_id" AS "schemaLogId"
`;

const GraphVariantsToLogModel = z.object({
  graphVariantVersionId: z.string(),
  schemaLogId: z.string(),
});

const schemaLogFields = psql`
  "id"
  ,  to_json("created_at") AS "createdAt"
  , "service_name" AS "serviceName"
  , "service_url" AS "serviceUrl"
  , "sdl"
`;

/** Schema log that is a "PUSH" aka not a removal etc. */
const ServiceSchemaPushLogModel = z.object({
  id: z.string(),
  createdAt: z.string(),
  serviceName: z.string(),
  serviceUrl: z.string(),
  sdl: z.string(),
});

type ServiceSchemaPushLog = z.TypeOf<typeof ServiceSchemaPushLogModel>;
