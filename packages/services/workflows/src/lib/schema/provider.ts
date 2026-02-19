import { parse, print } from 'graphql';
import { DatabasePool, sql } from 'slonik';
import type { Logger } from '@graphql-hive/logger';
import { errors, patch } from '@graphql-inspector/patch';
import { Project, SchemaObject } from '@hive/api';
import { ComposeAndValidateResult } from '@hive/api/shared/entities';
import type { ContractsInputType, SchemaBuilderApi } from '@hive/schema';
import { decodeCreatedAtAndUUIDIdBasedCursor } from '@hive/storage';
import { createTRPCProxyClient, httpLink } from '@trpc/client';

type SchemaProviderConfig = {
  /** URL of the Schema Service */
  serviceUrl: string;
  logger: Logger;
};

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

export function schemaProvider(providerConfig: SchemaProviderConfig) {
  const schemaService = createTRPCProxyClient<SchemaBuilderApi>({
    links: [
      httpLink({
        url: `${providerConfig.serviceUrl}/trpc`,
        fetch,
        // headers: {
        //   'x-request-id': `job-${args.job.id}`,
        // },
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
      compositionType: 'federation' | 'single' | 'stitching',
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

    async latestSchemas(args: { targetId: string; pool: DatabasePool }) {
      const latestVersion = await args.pool.maybeOne<{ id: string }>(
        sql`/* findLatestSchemaVersion */
        SELECT sv.id
        FROM schema_versions as sv
        WHERE sv.target_id = ${args.targetId}
        ORDER BY sv.created_at DESC
        LIMIT 1
      `,
      );

      if (!latestVersion) {
        return [];
      }

      const version = latestVersion.id;
      const result = await args.pool.query<{
        id: string;
        sdl: string;
        serviceName: string;
        serviceUrl: string;
        type: string;
      }>(
        sql`/* getSchemasOfVersion */
          SELECT
            sl.id,
            sl.sdl,
            lower(sl.service_name) as serviceName,
            sl.service_url as serviceUrl,
            p.type
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

      // @todo Consider parsing using zod parser.
      return [...result.rows];
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

      // fetch all latest schemas
      const services = await this.latestSchemas({
        targetId: args.targetId,
        pool: args.pool,
      });

      let nextCursor = cursor;
      // collect changes in paginated requests to avoid stalling the db
      do {
        const result = await args.pool.any<{
          id: string;
          serviceName: string | null;
          serviceUrl: string | null;
          schemaProposalChanges: any[];
        }>(sql`
          SELECT
              c."id"
            , c."service_name" as "serviceName"
            , c."service_url" as "serviceUrl"
            , c."schema_proposal_changes" as "schemaProposalChanges"
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
            c."schema_proposal_id" = ${args.proposalId}
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

        // Use the last id since we don't need to return whether there's a next page or not.
        // This may result in one extra DB call if there's exactly mod 20 results. Otherwise, avoids
        // fetching extra data.
        if (result.length === 20) {
          nextCursor = {
            createdAt: nextCursor?.createdAt ?? now,
            id: result[result.length - 1].id,
          };
        } else {
          nextCursor = null;
        }

        for (const row of result) {
          const service = services.find(s => row.serviceName === s.serviceName);
          if (service) {
            const ast = parse(service.sdl, { noLocation: true });
            service.sdl = print(
              patch(ast, row.schemaProposalChanges, { onError: errors.looseErrorHandler }),
            );

            if (row.serviceUrl) {
              service.serviceUrl = row.serviceUrl;
            }
          }
        }
      } while (nextCursor);

      return services;
    },
  };
}
