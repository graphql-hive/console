import { DocumentNode, GraphQLError, parse, print, SourceLocation } from 'graphql';
import { z } from 'zod';
import type { Logger } from '@graphql-hive/logger';
import { generateChangeHash, isChangeEqual } from '@graphql-inspector/compare-changes';
import type { Change } from '@graphql-inspector/core';
import { errors, patch } from '@graphql-inspector/patch';
import type { Project, SchemaObject } from '@hive/api';
import type { ComposeAndValidateResult } from '@hive/api/shared/entities';
import { CommonQueryMethods, PostgresDatabasePool, psql } from '@hive/postgres';
import type { ContractsInputType, SchemaBuilderApi } from '@hive/schema';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  HiveSchemaChangeModel,
  SchemaChangeModel,
} from '@hive/storage';
import { createTRPCProxyClient, httpLink } from '@trpc/client';

type SchemaProviderConfig = {
  /** URL of the Schema Service */
  schemaServiceUrl: string;
  logger: Logger;
};

const SchemaModel = z.object({
  id: z.string().uuid(),
  sdl: z.string(),
  serviceName: z.string().nullable(),
  serviceUrl: z.string().nullable(),
  type: z.string(),
});

const SchemaProposalChangesModel = z.object({
  id: z.string().uuid(),
  serviceName: z.string().nullable(),
  serviceUrl: z.string().nullable(),
  schemaProposalChanges: z.array(HiveSchemaChangeModel).default([]),
  createdAt: z.string(),
});

type SchemaProposalChangesModelType = z.TypeOf<typeof SchemaProposalChangesModel>;

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

export class GraphQLDocumentStringInvalidError extends Error {
  constructor(message: string, location?: SourceLocation) {
    const locationString = location ? ` at line ${location.line}, column ${location.column}` : '';
    super(`The provided SDL is not valid${locationString}\n: ${message}`);
  }
}

export type CreateSchemaObjectInput = {
  sdl: string;
  serviceName?: string | null;
  serviceUrl?: string | null;
};

export const emptySource = '*';

export function createSchemaObject(schema: CreateSchemaObjectInput): SchemaObject {
  let document: DocumentNode;

  try {
    document = parse(schema.sdl, {
      noLocation: true,
    });
  } catch (err) {
    if (err instanceof GraphQLError) {
      throw new GraphQLDocumentStringInvalidError(err.message, err.locations?.[0]);
    }
    throw err;
  }

  return {
    document,
    raw: schema.sdl,
    source: schema.serviceName ?? emptySource,
    url: schema.serviceUrl ?? null,
  };
}

export type SchemaProvider = ReturnType<typeof schemaProvider>;

export function convertProjectType(t: string) {
  const result = (
    {
      ['FEDERATION']: 'federation',
      ['SINGLE']: 'single',
      ['STITCHING']: 'stitching',
    } as const
  )[t];

  if (!result) {
    throw new Error('Invalid project type.');
  }
  return result;
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
      projectType: string,
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
      reason: string | null;
      status: 'ERROR' | 'SUCCESS';
      pool: PostgresDatabasePool;
    }) {
      const { pool, ...state } = args;
      await pool.query(
        psql`/* updateSchemaProposalComposition */
          UPDATE schema_proposals
          SET
              composition_status = ${state.status}
            , composition_timestamp = ${state.timestamp}
            , composition_status_reason = ${state.reason}
          WHERE id=${state.proposalId}`,
      );
    },

    async latestComposableSchemas(args: { targetId: string; pool: PostgresDatabasePool }) {
      const latestVersionId = await args.pool
        .maybeOneFirst(
          psql`/* findLatestComposableSchemaVersion */
        SELECT sv.id
        FROM schema_versions as sv
        WHERE sv.target_id = ${args.targetId} AND sv.is_composable IS TRUE
        ORDER BY sv.created_at DESC
        LIMIT 1
      `,
        )
        .then(z.string().nullable().parse);

      if (!latestVersionId) {
        return [];
      }

      const result = await args.pool.any(
        psql`/* getSchemasOfVersion */
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
            svl.version_id = ${latestVersionId}
            AND sl.action = 'PUSH'
            AND p.type != 'CUSTOM'
          ORDER BY
            sl.created_at DESC
        `,
      );
      return result.map(row => SchemaModel.parse(row));
    },

    async getBaseSchema(args: { targetId: string; pool: PostgresDatabasePool }) {
      const baseSchema = await args.pool
        .maybeOneFirst(
          psql`/* getBaseSchema */ SELECT base_schema FROM targets WHERE id=${args.targetId}`,
        )
        .then(z.string().nullable().parse);
      return baseSchema;
    },

    /**
     * Loops through all schema checks that are part of the schema proposal. This uses pagination
     * to avoid loading too much at once
     *
     * This is hard capped at 2_000 subgraphs for safety.
     **/
    async forEachProposalCheck(
      args: {
        targetId: string;
        proposalId: string;
        cursor?: string | null;
        pool: PostgresDatabasePool;
      },
      callback: (
        change: Omit<SchemaProposalChangesModelType, 'schemaProposalChanges'> & {
          schemaProposalChanges: Change[];
        },
      ) => void | Promise<void>,
    ) {
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
      let nextCursor = cursor;
      // collect changes in paginated requests to avoid stalling the db
      let i = 0;
      do {
        const result = await args.pool.any(psql`
          SELECT
              c."id"
            , c."service_name" as "serviceName"
            , c."service_url" as "serviceUrl"
            , c."schema_proposal_changes" as "schemaProposalChanges"
            , to_json(c."created_at") as "createdAt"
          FROM
            "schema_checks" as c
            INNER JOIN (
              SELECT COALESCE("service_name", '') as "service", "schema_proposal_id", max("created_at") as "maxdate"
              FROM schema_checks
              ${
                cursor
                  ? psql`
                    WHERE "schema_proposal_id" = ${args.proposalId}
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
                ? psql`
                  AND (
                    (
                      c."created_at" = ${cursor.createdAt}
                      AND c."id" < ${cursor.id}
                    )
                    OR c."created_at" < ${cursor.createdAt}
                  )
                `
                : psql``
            }
          ORDER BY
              c."created_at" DESC
            , c."id" DESC
          LIMIT 20
        `);

        const checks = result.map(row => {
          const check = SchemaProposalChangesModel.parse(row);
          return {
            ...check,
            schemaProposalChanges: check.schemaProposalChanges.map((c): Change<any> => {
              return {
                message: c.message,
                meta: c.meta,
                type: c.type,
                path: c.path ?? undefined,
                criticality: {
                  level: c.criticality,
                },
              } satisfies Change<any>;
            }),
          };
        });

        for (const check of checks) {
          await callback(check);
        }

        if (checks.length === 20) {
          nextCursor = {
            // Keep the created at because we want the same set of checks when joining on the "latest".
            createdAt: nextCursor?.createdAt ?? checks[0]?.createdAt ?? now,
            id: checks[checks.length - 1].id,
          };
        } else {
          nextCursor = null;
        }
      } while (nextCursor && ++i < maxLoops);
    },

    async proposedSchemas(args: {
      targetId: string;
      proposalId: string;
      cursor?: string | null;
      pool: PostgresDatabasePool;
    }) {
      const services = await this.latestComposableSchemas({
        targetId: args.targetId,
        pool: args.pool,
      });

      await this.forEachProposalCheck(args, change => {
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
      });

      return services;
    },

    async approveChanges(
      conn: CommonQueryMethods,
      records: {
        change: Change;
        proposalId: string;
        service?: string;
        targetId: string;
      }[],
    ) {
      providerConfig.logger.info(
        'Approving changes (%s): %o',
        records.map(r => generateChangeHash(r.change)).join(', '),
        records[0]?.change,
      );
      const values = records.map(
        r => psql`(
          ${generateChangeHash(r.change)}
          ,${JSON.stringify(r.change)}
          ,${r.proposalId}
          ,${r.service ?? null}
          ,${r.targetId}
        )`,
      );

      await conn.query(psql`
          INSERT INTO "proposal_approved_changes" (
             hash
            ,change
            ,proposal_id
            ,service
            ,target_id
          )
          VALUES ${psql.join(values, psql.fragment`,`)}
        `);
    },

    async implementChanges(
      conn: CommonQueryMethods,
      records: {
        /** Change ID */
        id: string;

        schemaVersionId: string;
      }[],
    ) {
      await conn.query(psql`
          UPDATE proposal_approved_changes as p
          SET schema_version_id = v."schemaVersionId"
          FROM jsonb_to_recordset(
            ${psql.jsonb(records)}
          ) as v(id uuid, "schemaVersionId" uuid)
          WHERE p.id = v.id;
        `);
    },

    /**
     * If we have a set of changes, this looks up to determine whether or not those changes
     * have been approved. This is useful for looking up (on check or publish) whether the
     * change matches any of the approved proposals' changess, because in this situation
     * there is no known proposal or schema version to match on. This function queries for all
     * passed in changes, so any batching/pagination should be done prior to calling this function.
     *
     * This is also ran for the schema checks page to display whether or not a change has
     * been approved by a proposal or not.
     *
     * @returns An array of change approval records. The index corresponds with the original
     *          changes array passed.
     */
    async getEquivalentUnimplementedApprovedChanges(
      conn: CommonQueryMethods,
      args: { changes: Change[]; targetId: string },
    ) {
      // calculate hashes the same order as the changes
      const hashes = args.changes.map(generateChangeHash);

      // fetch the changes based on the hash. Note that ordering is not guaranteed here
      const result = await conn.any(psql`
        SELECT ${proposalApprovedChangeFields(psql`"c"`)}
        FROM "proposal_approved_changes" as "c"
        WHERE hash = ANY(${psql.array(hashes, 'text')})
          AND target_id = ${args.targetId}
          AND schema_version_id IS NULL
      `);

      const approvedChanges = result.map(row => ProposalApprovedChangeModel.parse(row));
      const approvedChangeLookup = Map.groupBy(approvedChanges, c => c.hash);

      // iterate over all changes and hashes, determine if this change is within the approvedChanges list
      return args.changes.map((change, i) => {
        const hash = hashes[i];
        const approvedMatch = approvedChangeLookup.get(hash);
        const changeApproval =
          approvedMatch?.find(match => {
            return isChangeEqual(match.change as Change<any>, change);
          }) ?? null;

        return changeApproval;
      });
    },

    async schemaVersionChanges({
      pool,
      versionId,
    }: {
      pool: PostgresDatabasePool;
      versionId: string;
    }) {
      const changes = await pool
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
          "schema_version_id" = ${versionId}
      `,
        )
        .then(z.array(HiveSchemaChangeModel).parse);

      if (changes.length === 0) {
        return null;
      }

      return changes;
    },
  };
}

const proposalApprovedChangeFields = (prefix = psql`"proposal_approved_changes"`) => psql`
     ${prefix}."id"
    ,${prefix}."hash"
    ,${prefix}."change"
    ,${prefix}."proposal_id" as "proposalId"
    ,${prefix}."schema_version_id" as "schemaVersionId"
    ,${prefix}."service"
    ,${prefix}."target_id" as "targetId"
`;

const ProposalApprovedChangeModel = z
  .object({
    id: z.string(),
    // the type and path of the change is baked into the hash, so it's safe
    hash: z.string(),
    change: SchemaChangeModel,
    proposalId: z.string(),
    schemaVersionId: z.string().nullable(),
    service: z.string().nullable(),
    targetId: z.string(),
  })
  .transform(data => ({
    ...data,
    change: {
      // add back the path since that doesn't get saved to the db except for in the hash
      path: data.hash.split(':')[1] as string | undefined,
      ...data.change,
    },
  }));
