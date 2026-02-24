import { parse, print } from 'graphql';
import { DatabasePool, sql } from 'slonik';
import { z } from 'zod';
import type { Logger } from '@graphql-hive/logger';
import { Change } from '@graphql-inspector/core';
import { errors, patch } from '@graphql-inspector/patch';
import { Project, SchemaObject } from '@hive/api';
import { ComposeAndValidateResult, ProjectType } from '@hive/api/shared/entities';
import type { ContractsInputType, SchemaBuilderApi } from '@hive/schema';
import { decodeCreatedAtAndUUIDIdBasedCursor, HiveSchemaChangeModel } from '@hive/storage';
import { createTRPCProxyClient, httpLink } from '@trpc/client';

type SchemaProviderConfig = {
  /** URL of the Schema Service */
  schemaServiceUrl: string;
  logger: Logger;
};

const SchemaModel = z.object({
  id: z.string().uuid(),
  sdl: z.string(),
  serviceName: z.optional(z.string()),
  serviceUrl: z.optional(z.string()),
  type: z.string(),
});

const SchemaProposalChangesModel = z.object({
  id: z.string().uuid(),
  serviceName: z.string().optional(),
  serviceUrl: z.string().optional(),
  schemaProposalChanges: z.array(HiveSchemaChangeModel).default([]),
  createdAt: z.string(),
});

function createExternalConfig(config: Project['externalComposition']) {
  // : ExternalCompositionConfig {
  if (config && config.enabled) {
    if (!config.endpoint) {
      throw new Error('External composition error: endpoint is missing');
    }

    if (!config.encryptedSecret) {
      throw new Error('External composition error: encryptedSecret is missing');
    }

    return {
      endpoint: config.endpoint,
      encryptedSecret: config.encryptedSecret,
    };
  }

  return null;
}

export type SchemaProvider = ReturnType<typeof schemaProvider>;

export function convertProjectType(t: ProjectType) {
  return (
    {
      [ProjectType.FEDERATION]: 'federation',
      [ProjectType.SINGLE]: 'single',
      [ProjectType.STITCHING]: 'stitching',
    } as const
  )[t];
}

export function schemaProvider(providerConfig: SchemaProviderConfig) {
  const schemaService = createTRPCProxyClient<SchemaBuilderApi>({
    links: [
      httpLink({
        url: `${providerConfig.schemaServiceUrl}/trpc`,
        fetch,
      }),
    ],
  });

  return {
    id: 'schema' as const,
    /**
     * Compose and validate schemas via the schema service.
     * - Requests time out after 30 seconds and result in a human readable error response
     * - In case the incoming request is canceled, the call to the schema service is aborted
     */
    async composeAndValidate(
      projectType: ProjectType,
      schemas: SchemaObject[],
      config: {
        /** Whether external composition should be used (only Federation) */
        external: Project['externalComposition'];
        /** Whether native composition should be used (only Federation) */
        native: boolean;
        /** Specified contracts (only Federation) */
        contracts: ContractsInputType | null;
      },
    ) {
      const compositionType = convertProjectType(projectType);
      providerConfig.logger.debug(
        'Composing and validating schemas (type=%s, method=%s)',
        compositionType,
        compositionType === 'federation'
          ? config.native
            ? 'native'
            : config.external.enabled
              ? 'external'
              : 'v1'
          : 'none',
      );

      const timeoutAbortSignal = AbortSignal.timeout(30_000);

      const onTimeout = () => {
        providerConfig.logger.debug(
          'Composition HTTP request aborted due to timeout of 30 seconds.',
        );
      };
      timeoutAbortSignal.addEventListener('abort', onTimeout);

      try {
        const result = await schemaService.composeAndValidate.mutate(
          {
            type: compositionType,
            schemas: schemas.map(s => ({
              raw: s.raw,
              source: s.source,
              url: s.url ?? null,
            })),
            external: createExternalConfig(config.external),
            native: config.native,
            contracts: config.contracts,
          },
          {
            // Limit the maximum time allowed for composition requests to 30 seconds to avoid a dead-lock
            signal: timeoutAbortSignal,
          },
        );
        return result;
      } catch (err) {
        // In case of a timeout error we return something the user can process
        if (timeoutAbortSignal.reason) {
          return {
            contracts: null,
            metadataAttributes: null,
            schemaMetadata: null,
            sdl: null,
            supergraph: null,
            tags: null,
            includesNetworkError: true,
            includesException: false,
            errors: [
              {
                message: 'The schema composition timed out. Please try again.',
                source: 'composition',
              },
            ],
          } satisfies ComposeAndValidateResult;
        }

        throw err;
      } finally {
        timeoutAbortSignal.removeEventListener('abort', onTimeout);
      }
    },

    async updateSchemaProposalComposition(args: {
      proposalId: string;
      timestamp: string;
      status: 'error' | 'success' | 'fail';
      pool: DatabasePool;
    }) {
      const { pool, ...state } = args;
      await pool.query<unknown>(
        sql`/* updateSchemaProposalComposition */ UPDATE schema_proposals SET composition_status = ${args.status}, composition_timestamp = ${args.timestamp} WHERE id=${args.proposalId}`,
      );
    },

    async latestComposableSchemas(args: { targetId: string; pool: DatabasePool }) {
      const latestVersion = await args.pool.maybeOne<{ id: string }>(
        sql`/* findLatestComposableSchemaVersion */
        SELECT sv.id
        FROM schema_versions as sv
        WHERE sv.target_id = ${args.targetId} AND sv.is_composable IS TRUE
        ORDER BY sv.created_at DESC
        LIMIT 1
      `,
      );

      if (!latestVersion) {
        return [];
      }

      const version = latestVersion.id;
      const result = await args.pool.query<unknown>(
        sql`/* getSchemasOfVersion */
          SELECT
              sl.id
            , sl.sdl
            , lower(sl.service_name) as "serviceName"
            , sl.service_url as "serviceUrl"
            , p.type
          FROM schema_version_to_log AS svl
          LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
          LEFT JOIN projects as p ON (p.id = sl.project_id)
          WHERE
            svl.version_id = ${version}
            AND sl.action = 'PUSH'
            AND p.type != 'CUSTOM'
          ORDER BY
            sl.created_at DESC
        `,
      );
      return result.rows.map(row => SchemaModel.parse(row));
    },

    async getBaseSchema(args: { targetId: string; pool: DatabasePool }) {
      const data = await args.pool.maybeOne<Record<string, string>>(
        sql`/* getBaseSchema */ SELECT base_schema FROM targets WHERE id=${args.targetId}`,
      );
      return data?.base_schema ?? null;
    },

    async proposedSchemas(args: {
      targetId: string;
      proposalId: string;
      cursor?: string | null;
      pool: DatabasePool;
    }) {
      const now = new Date().toISOString();
      let cursor: {
        createdAt: string;
        id: string;
      } | null = null;

      if (args.cursor) {
        cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.cursor);
      }

      // fetch all latest schemas. Support up to 2_000 subgraphs.
      const maxLoops = 100;
      const services = await this.latestComposableSchemas({
        targetId: args.targetId,
        pool: args.pool,
      });

      let nextCursor = cursor;
      // collect changes in paginated requests to avoid stalling the db
      let i = 0;
      do {
        const result = await args.pool.query<unknown>(sql`
          SELECT
              c."id"
            , c."service_name" as "serviceName"
            , c."service_url" as "serviceUrl"
            , c."schema_proposal_changes" as "schemaProposalChanges"
            , c.created_at as "createdAt"
          FROM
            "schema_checks" as c
            INNER JOIN (
              SELECT COALESCE("service_name", '') as "service", "schema_proposal_id", max("created_at") as "maxdate"
              FROM schema_checks
              ${
                cursor
                  ? sql`
                    WHERE "schema_proposal_id" = ${args.proposalId}
                    AND (
                      (
                        "created_at" = ${cursor.createdAt}
                        AND "id" < ${cursor.id}
                      )
                      OR "created_at" < ${cursor.createdAt}
                    )
                  `
                  : sql``
              }
              GROUP BY "service", "schema_proposal_id"
            ) as cc
            ON c."schema_proposal_id" = cc."schema_proposal_id"
              AND COALESCE(c."service_name", '') = cc."service"
              AND c."created_at" = cc."maxdate"
          WHERE
            c."target_id" = ${args.targetId}
            AND c."schema_proposal_id" = ${args.proposalId}
            ${
              cursor
                ? sql`
                  AND (
                    (
                      c."created_at" = ${cursor.createdAt}
                      AND c."id" < ${cursor.id}
                    )
                    OR c."created_at" < ${cursor.createdAt}
                  )
                `
                : sql``
            }
          ORDER BY
              c."created_at" DESC
            , c."id" DESC
          LIMIT 20
        `);

        const changes = result.rows.map(row => {
          const value = SchemaProposalChangesModel.parse(row);
          return {
            ...value,
            schemaProposalChanges: value.schemaProposalChanges.map(c => {
              const change: Change<any> = {
                ...c,
                path: c.path ?? undefined,
                criticality: {
                  level: c.criticality,
                },
              };
              return change;
            }),
          };
        });

        if (changes.length === 20) {
          nextCursor = {
            // Keep the created at because we want the same set of checks when joining on the "latest".
            createdAt: nextCursor?.createdAt ?? changes[0]?.createdAt ?? now,
            id: changes[changes.length - 1].id,
          };
        } else {
          nextCursor = null;
        }

        for (const change of changes) {
          const service = services.find(s => change.serviceName === s.serviceName);
          if (service) {
            const ast = parse(service.sdl, { noLocation: true });
            service.sdl = print(
              patch(ast, change.schemaProposalChanges, { onError: errors.looseErrorHandler }),
            );
            if (change.serviceUrl) {
              service.serviceUrl = change.serviceUrl;
            }
          }
        }
      } while (nextCursor && ++i < maxLoops);

      return services;
    },
  };
}
