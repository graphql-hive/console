/**
 * This wraps the database calls for schema proposals and required validation
 */
import { Inject, Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { generateChangeHash, isChangeEqual } from '@graphql-inspector/compare-changes';
import { Change } from '@graphql-inspector/core';
import { CommonQueryMethods, PostgresDatabasePool, psql } from '@hive/postgres';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
  SchemaChangeModel,
} from '@hive/storage';
import { TaskScheduler } from '@hive/workflows/kit';
import { SchemaProposalApprovalTask } from '@hive/workflows/tasks/schema-proposal-approval';
import { SchemaProposalCompositionTask } from '@hive/workflows/tasks/schema-proposal-composition';
import { SchemaProposalImplementationTask } from '@hive/workflows/tasks/schema-proposal-implementation';
import { SchemaProposalStage } from '../../../__generated__/types';
import { Logger } from '../../shared/providers/logger';
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
    private pool: PostgresDatabasePool,
    private storage: Storage,
    @Inject(SCHEMA_PROPOSALS_ENABLED) private schemaProposalsEnabled: boolean,
    private taskScheduler: TaskScheduler,
  ) {
    this.logger = logger.child({ source: 'SchemaProposalStorage' });
  }

  async runBackgroundComposition(input: {
    proposalId: string;
    targetId: string;
    externalComposition: {
      enabled: boolean;
      endpoint?: string | null;
      encryptedSecret?: string | null;
    };
    native: boolean;
  }) {
    await this.taskScheduler.scheduleTask(SchemaProposalCompositionTask, input);
  }

  async runBackgroundApproval(input: { proposalId: string; targetId: string }) {
    await this.taskScheduler.scheduleTask(SchemaProposalApprovalTask, input);
  }

  /**
   * Kicks off a job to check and update all changes that are part of the schema version, to flag them as
   * implemented if they represent an approved schema change
   */
  async runBackgroundImplementationTracker(
    input: {
      targetId: string;
      schemaVersionId: string;
    },
    conn: CommonQueryMethods = this.pool,
  ) {
    await this.taskScheduler.scheduleTask(SchemaProposalImplementationTask, input, { trx: conn });
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
    author: string;
    serviceName: string;
  }) {
    this.logger.debug(
      'manually transition schema (proposal=%s, stage=%s, author=%s)',
      args.id,
      args.stage,
      args.author,
    );

    await this.assertSchemaProposalsEnabled({
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
    const review = await this.pool.transaction('manuallyTransitionProposal', async conn => {
      await conn.query(
        psql`
            UPDATE "schema_proposals"
            SET "stage" = ${args.stage}
            WHERE "id" = ${args.id} AND "stage" <> 'IMPLEMENTED'
          `,
      );

      const row = await conn.maybeOne(psql`
          INSERT INTO schema_proposal_reviews
            ("schema_proposal_id", "stage_transition", "author", "service_name")
          VALUES (
            ${args.id}
            , ${args.stage}
            , ${args.author}
            , ${args.serviceName}
          )
          RETURNING ${schemaProposalReviewFields}
        `);

      return SchemaProposalReviewModel.parse(row);
    });

    // @todo rollback if this fails
    if (args.stage === 'APPROVED') {
      await this.runBackgroundApproval({ proposalId: args.id, targetId: args.targetId });
    }

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
    author: string;
  }) {
    this.logger.debug(
      'propose schema (targetId=%s, title=%s, stage=%s)',
      args.targetId,
      args.title,
      args.stage,
    );

    await this.assertSchemaProposalsEnabled({
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
      .maybeOne(
        psql`
          INSERT INTO "schema_proposals" as "sp"
            ("target_id", "title", "description", "stage", "author")
          VALUES
            (
              ${args.targetId}
              , ${args.title}
              , ${args.description}
              , ${args.stage}
              , ${args.author}
            )
          RETURNING ${schemaProposalFields(psql`sp`)}
        `,
      )
      .then(row => SchemaProposalModel.parse(row));

    return {
      type: 'ok' as const,
      proposal,
    };
  }

  /**
   * A stripped down version of getProposal that only returns the ID. This is intended
   * to be used
   */
  async getProposalTargetId(args: { id: string }) {
    this.logger.debug('Get proposal target ID (proposal=%s)', args.id);
    const result = await this.pool
      .maybeOne(
        psql`
          SELECT
              id
            , target_id as "targetId"
          FROM
            "schema_proposals"
          WHERE
            id=${args.id}
        `,
      )
      .then(row => SchemaProposalTargetIdModel.safeParse(row));

    return result.data ?? null;
  }

  async getProposal(args: { id: string }) {
    this.logger.debug('Get proposal (proposal=%s)', args.id);
    const result = await this.pool
      .maybeOne(
        psql`
          SELECT
            ${schemaProposalFields(psql`sp`)}
          FROM
            "schema_proposals" AS "sp"
          WHERE
            "sp"."id" = ${args.id}
        `,
      )
      .then(row => SchemaProposalModel.safeParse(row));

    return result.data ?? null;
  }

  async getPaginatedProposals(args: {
    targetId: string;
    first: number;
    after: string;
    stages: ReadonlyArray<SchemaProposalStage>;
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
    const result = await this.pool.any(psql`
      SELECT
        ${schemaProposalFields(psql`sp`)}
      FROM
        "schema_proposals" as "sp"
      WHERE
        sp."target_id" = ${args.targetId}
        ${
          cursor
            ? psql`
                AND (
                  (
                    sp."created_at" = ${cursor.createdAt}
                    AND sp."id" < ${cursor.id}
                  )
                  OR sp."created_at" < ${cursor.createdAt}
                )
              `
            : psql``
        }
        ${
          args.stages.length > 0
            ? psql`
              AND (
                sp."stage" = ANY(${psql.array(args.stages, 'schema_proposal_stage')})
              )
              `
            : psql``
        }
      ORDER BY sp."created_at" DESC, sp."id"
      LIMIT ${limit + 1}
    `);

    let items = result.map(row => {
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

  async getPaginatedReviews(args: { proposalId: string; first: number; after: string }) {
    this.logger.debug('Get paginated reviews (proposal=%s, after=%s)', args.proposalId, args.after);
    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;
    const cursor = args.after ? decodeCreatedAtAndUUIDIdBasedCursor(args.after) : null;

    this.logger.debug(
      'Select by proposalId ID (proposal=%s, cursor=%s, limit=%d)',
      args.proposalId,
      cursor,
      limit,
    );
    const result = await this.pool.any(psql`
      SELECT
        ${schemaProposalReviewFields}
      FROM
        "schema_proposal_reviews"
      WHERE
        "schema_proposal_id" = ${args.proposalId}
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
      ORDER BY "created_at" DESC, "id"
      LIMIT ${limit + 1}
    `);

    let items = result.map(row => {
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

  /**
   * Updates an approved change to set the schema version where it has been implemented.
   */
  async implementApprovedChange(args: {
    // the approved change's ID
    id: string;
    targetId: string;
    // the schema version where this change has been implemented
    implementingSchemaVersionId: string;
  }) {
    this.logger.debug(
      'Marking approved change as implemented by schema version (id=%s, target=%s, schema_version=%s)',
      args.id,
      args.targetId,
      args.implementingSchemaVersionId,
    );
    await this.pool.query(psql`
      UPDATE "proposal_approved_changes"
      SET "schema_version_id" = ${args.implementingSchemaVersionId}
      WHERE id = ${args.id}
        AND target_id = ${args.targetId}
        AND schema_version_id IS NULL
    `);
  }

  /**
   * This looks up the change approval records for a schema proposal, and finds
   * where they have been implemented in a schema version.
   */
  async getImplementedVersionsByProposalId(args: { schemaProposalId: string; targetId: string }) {
    // fetch the changes based on the hash. Note that ordering is not guaranteed here
    const implementedChanges = await this.pool
      .any(
        psql`
      SELECT ${proposalApprovedChangeFields(psql`"c"`)}
      FROM "proposal_approved_changes" as "c"
      WHERE proposal_id = ${args.schemaProposalId}
        AND target_id = ${args.targetId}
        AND schema_version_id IS NOT NULL
    `,
      )
      .then(result => result.map(row => ProposalApprovedChangeModel.parse(row)));
    return implementedChanges;
  }

  /**
   * This looks up the change approval record for an existing schema version.
   * This is used on the schema history page to show which proposal each change
   * belongs to
   */
  async getImplementedApprovedChangesByVersionId(args: {
    schemaVersionId: string;
    targetId: string;
  }) {
    // fetch the changes based on the hash. Note that ordering is not guaranteed here
    const implementedChanges = await this.pool
      .any(
        psql`
      SELECT ${proposalApprovedChangeFields(psql`"c"`)}
      FROM proposal_approved_changes as "c"
      WHERE schema_version_id = ${args.schemaVersionId}
        AND target_id = ${args.targetId}
    `,
      )
      .then(result => result.map(row => ProposalApprovedChangeModel.parse(row)));
    return implementedChanges;
  }

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
    args: { changes: Change[]; targetId: string },
    conn: CommonQueryMethods = this.pool,
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
  }
}

// @todo dedupe from the implementation workflow
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

const proposalApprovedChangeFields = (prefix = psql`"proposal_approved_changes"`) => psql`
     ${prefix}."id"
    ,${prefix}."hash"
    ,${prefix}."change"
    ,${prefix}."proposal_id" as "proposalId"
    ,${prefix}."schema_version_id" as "schemaVersionId"
    ,${prefix}."service"
    ,${prefix}."target_id" as "targetId"
`;

const schemaProposalFields = (prefix = psql`"schema_proposals"`) => psql`
    ${prefix}."id"
  , to_json(${prefix}."created_at") as "createdAt"
  , to_json(${prefix}."updated_at") as "updatedAt"
  , ${prefix}."title"
  , ${prefix}."description"
  , ${prefix}."stage"
  , ${prefix}."target_id" as "targetId"
  , ${prefix}."author"
  , ${prefix}."composition_status" as "compositionStatus"
  , to_json(${prefix}."composition_timestamp") as "compositionTimestamp"
  , ${prefix}."composition_status_reason" as "compositionStatusReason"
`;

const schemaProposalReviewFields = psql`
  "id"
  , "schema_proposal_id"
  , to_json("created_at") as "createdAt"
  , "stage_transition" as "stageTransition"
  , "author"
  , "line_text" as "lineText"
  , "schema_coordinate" as "schemaCoordinate"
  , "service_name" as "serviceName"
`;

const ManualTransitionStageModel = z.enum(['DRAFT', 'OPEN', 'APPROVED', 'CLOSED']);

const SchemaProposalReviewModel = z.object({
  id: z.string(),
  createdAt: z.string(),
  stageTransition: ManualTransitionStageModel,
  author: z.string(),
  lineText: z.string().nullable().optional().default(null),
  schemaCoordinate: z.string().nullable().optional().default(null),
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
  author: z.string(),
  compositionStatus: z.enum(['ERROR', 'SUCCESS']).nullable(),
  compositionStatusReason: z.string().nullable(),
  compositionTimestamp: z.string().nullable(),
});

/**
 * Minimal model for extracting just the target Id for permission checks.
 */
const SchemaProposalTargetIdModel = z.object({
  id: z.string(),
  targetId: z.string(),
});

export type SchemaProposalRecord = z.infer<typeof SchemaProposalModel>;
export type SchemaProposalReviewRecord = z.infer<typeof SchemaProposalReviewModel>;
