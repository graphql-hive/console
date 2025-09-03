/**
 * This wraps the database calls for schema proposals and required validation
 */
import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
} from '@hive/storage';
import { SchemaProposalStage } from '../../../__generated__/types';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { Storage } from '../../shared/providers/storage';
import { SCHEMA_PROPOSALS_ENABLED } from './schema-proposals-enabled-token';

const SchemaProposalsTitleModel = z
  .string()
  .min(1, 'Must be at least 1 character long')
  .max(64, 'Must be at most 64 characters long');

const SchemaProposalsDescriptionModel = z
  .string()
  .trim()
  .max(1024, 'Must be at most 1024 characters long')
  .default('');

const noAccessToSchemaProposalsMessage =
  'This organization has no access to schema proposals. Please contact the Hive team for early access.';

@Injectable({
  scope: Scope.Operation,
})
export class SchemaProposalStorage {
  private logger: Logger;

  constructor(
    logger: Logger,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    private storage: Storage,
    @Inject(SCHEMA_PROPOSALS_ENABLED) private schemaProposalsEnabled: Boolean, // @todo
  ) {
    this.logger = logger.child({ source: 'SchemaProposalStorage' });
  }

  private async assertSchemaProposalsEnabled(args: {
    organizationId: string;
    targetId: string;
    proposalId?: string;
  }) {
    if (this.schemaProposalsEnabled === false) {
      const organization = await this.storage.getOrganization({
        organizationId: args.organizationId,
      });
      if (organization.featureFlags.appDeployments === false) {
        this.logger.debug(
          'organization has no access to schema proposals (target=%s, proposal=%s)',
          args.targetId,
          args.proposalId,
        );
        return {
          type: 'error' as const,
          error: {
            message: noAccessToSchemaProposalsMessage,
            details: null,
          },
        };
      }
    }
  }

  async manuallyTransitionProposal(args: {
    organizationId: string;
    targetId: string;
    id: string;
    stage: SchemaProposalStage;
    userId: string;
    serviceName: string;
  }) {
    this.logger.debug(
      'manually transition schema (proposal=%s, stage=%s, userId=%s)',
      args.id,
      args.stage,
      args.userId,
    );

    this.assertSchemaProposalsEnabled({
      organizationId: args.organizationId,
      targetId: args.targetId,
      proposalId: undefined,
    });

    const stageValidationResult = ManualTransitionStageModel.safeParse(args.stage);
    if (stageValidationResult.error) {
      return {
        type: 'error' as const,
        error: {
          message: 'Invalid input',
          details: {
            stage: stageValidationResult.error?.issues[0].message ?? null,
          },
        },
      };
    }
    const review = await this.pool.transaction(async conn => {
      await conn.maybeOne<unknown>(
        sql`
            UPDATE "schema_proposals"
            SET "stage" = ${args.stage}
            WHERE "id" = ${args.id} AND "stage" <> 'IMPLEMENTED'
          `,
      );
      const row = await conn.maybeOne(sql`
          INSERT INTO schema_proposal_reviews
            ("schema_proposal_id", "stage_transition", "user_id", "service_name")
          VALUES (
            ${args.id}
            , ${args.stage}
            , ${args.userId}
            , ${args.serviceName}
          )
          RETURNING ${schemaProposalReviewFields}
        `);
      return SchemaProposalReviewModel.parse(row);
    });

    console.log(JSON.stringify(review));

    return {
      type: 'ok' as const,
      review,
    };
  }

  async createProposal(args: {
    organizationId: string;
    targetId: string;
    title: string;
    description: string;
    stage: SchemaProposalStage;
    userId: string | null;
  }) {
    this.logger.debug(
      'propose schema (targetId=%s, title=%s, stage=%s)',
      args.targetId,
      args.title,
      args.stage,
    );

    this.assertSchemaProposalsEnabled({
      organizationId: args.organizationId,
      targetId: args.targetId,
      proposalId: undefined,
    });

    const titleValidationResult = SchemaProposalsTitleModel.safeParse(args.title);
    const descriptionValidationResult = SchemaProposalsDescriptionModel.safeParse(args.description);
    if (titleValidationResult.error || descriptionValidationResult.error) {
      return {
        type: 'error' as const,
        error: {
          message: 'Invalid input',
          details: {
            title: titleValidationResult.error?.issues[0].message ?? null,
            description: descriptionValidationResult.error?.issues[0].message ?? null,
          },
        },
      };
    }
    const proposal = await this.pool
      .maybeOne<unknown>(
        sql`
          INSERT INTO "schema_proposals" as "sp"
            ("target_id", "title", "description", "stage", "user_id")
          VALUES
            (
              ${args.targetId}
              , ${args.title}
              , ${args.description}
              , ${args.stage}
              , ${args.userId}
            )
          RETURNING ${schemaProposalFields}
        `,
      )
      .then(row => SchemaProposalModel.parse(row));

    return {
      type: 'ok' as const,
      proposal,
    };
  }

  async getProposal(args: { id: string }) {
    this.logger.debug('Get proposal (proposal=%s)', args.id);
    const result = await this.pool
      .maybeOne<unknown>(
        sql`
          SELECT
            ${schemaProposalFields}
            , u."display_name" as "author"
          FROM
            "schema_proposals" AS "sp"
          LEFT JOIN "users" AS "u"
            ON "u"."id" = "sp"."user_id"
          WHERE
            "sp"."id" = ${args.id}
          LIMIT 1
        `,
      )
      .then(row => SchemaProposalModel.parse(row));

    return result;
  }

  async getPaginatedProposals(args: {
    targetId: string;
    first: number;
    after: string;
    stages: ReadonlyArray<SchemaProposalStage>;
    users: ReadonlyArray<string>;
  }) {
    this.logger.debug(
      'Get paginated proposals (target=%s, after=%s, stages=%s)',
      args.targetId,
      args.after,
      args.stages.join(','),
    );
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;
    const cursor = args.after ? decodeCreatedAtAndUUIDIdBasedCursor(args.after) : null;

    this.logger.debug(
      'Select by target ID (targetId=%s, cursor=%s, limit=%d)',
      args.targetId,
      cursor,
      limit,
    );
    const result = await this.pool.query<unknown>(sql`
      SELECT
        ${schemaProposalFields}
        , u."display_name" as "author"
      FROM
        "schema_proposals" as "sp"
      LEFT JOIN "users" as "u"
        ON u."id" = sp."user_id"
      WHERE
        sp."target_id" = ${args.targetId}
        ${
          cursor
            ? sql`
                AND (
                  (
                    sp."created_at" = ${cursor.createdAt}
                    AND sp."id" < ${cursor.id}
                  )
                  OR sp."created_at" < ${cursor.createdAt}
                )
              `
            : sql``
        }
        ${
          args.stages.length > 0
            ? sql`
              AND (
                sp."stage" = ANY(${sql.array(args.stages, 'schema_proposal_stage')})
              )
              `
            : sql``
        }
        ${
          args.users.length > 0
            ? sql`
              AND (
                sp."user_id" = ANY(${sql.array(args.users, 'uuid')})
              )
              `
            : sql``
        }
      ORDER BY sp."created_at" DESC, sp."id"
      LIMIT ${limit + 1}
    `);

    let items = result.rows.map(row => {
      const node = SchemaProposalModel.parse(row);

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

  async getPaginatedReviews(args: {
    proposalId: string;
    first: number;
    after: string;
    authors: string[];
  }) {
    this.logger.debug('Get paginated reviews (proposal=%s, after=%s)', args.proposalId, args.after);
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;
    const cursor = args.after ? decodeCreatedAtAndUUIDIdBasedCursor(args.after) : null;

    this.logger.debug(
      'Select by proposalId ID (proposal=%s, cursor=%s, limit=%d)',
      args.proposalId,
      cursor,
      limit,
    );
    const result = await this.pool.query<unknown>(sql`
      SELECT
        ${schemaProposalReviewFields}
      FROM
        "schema_proposal_reviews"
      WHERE
        "schema_proposal_id" = ${args.proposalId}
        ${
          cursor
            ? sql`
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
      ORDER BY "created_at" DESC, "id"
      LIMIT ${limit + 1}
    `);

    let items = result.rows.map(row => {
      const node = SchemaProposalReviewModel.parse(row);

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
}

const schemaProposalFields = sql`
  sp."id"
  , to_json(sp."created_at") as "createdAt"
  , to_json(sp."updated_at") as "updatedAt"
  , sp."title"
  , sp."description"
  , sp."stage"
  , sp."target_id" as "targetId"
  , sp."user_id" as "userId"
  , sp."comments_count" as "commentsCount"
`;

const schemaProposalReviewFields = sql`
  "id"
  , "schema_proposal_id"
  , to_json("created_at") as "createdAt"
  , "stage_transition" as "stageTransition"
  , "user_id" as "userId"
  , "line_text" as "lineText"
  , "schema_coordinate" as "schemaCoordinate"
  , "resolved_by_user_id" as "resolvedByUserId"
  , "service_name" as "serviceName"
`;

const ManualTransitionStageModel = z.enum(['DRAFT', 'OPEN', 'APPROVED', 'CLOSED']);

const SchemaProposalReviewModel = z.object({
  id: z.string(),
  createdAt: z.string(),
  stageTransition: ManualTransitionStageModel,
  userId: z.string().nullable().optional().default(null), // if deleted
  lineText: z.string().nullable().optional().default(null),
  schemaCoordinate: z.string().nullable().optional().default(null),
  resolvedByUserId: z.string().nullable().optional().default(null),
  serviceName: z.string(),
});

const StageModel = z.enum(['DRAFT', 'OPEN', 'APPROVED', 'IMPLEMENTED', 'CLOSED']);

const SchemaProposalModel = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  title: z.string(),
  description: z.string(),
  stage: StageModel,
  targetId: z.string(),
  author: z.string().nullable().default('none'),
  commentsCount: z.number(),
});

export type SchemaProposalRecord = z.infer<typeof SchemaProposalModel>;
export type SchemaProposalReviewRecord = z.infer<typeof SchemaProposalReviewModel>;
