import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type DatabasePool } from 'slonik';
import { z } from 'zod';
import { getLocalLang, getTokenSync } from '@nodesecure/i18n';
import * as jsxray from '@nodesecure/js-x-ray';
import type { Target } from '../../../shared/entities';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { Storage } from '../../shared/providers/storage';

const SourceCodeModel = z.string().max(5_000);

const UpdatePreflightScriptModel = z.strictObject({
  // Use validation only on insertion
  sourceCode: SourceCodeModel.superRefine((val, ctx) => {
    try {
      const { warnings } = scanner.analyse(val);
      for (const warning of warnings) {
        const message = getTokenSync(jsxray.warnings[warning.kind].i18n);
        throw new Error(message);
      }
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }),
});

const PreflightScriptModel = z.strictObject({
  id: z.string(),
  sourceCode: SourceCodeModel,
  targetId: z.string(),
  createdByUserId: z.union([z.string(), z.null()]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type PreflightScript = z.TypeOf<typeof PreflightScriptModel>;

const scanner = new jsxray.AstAnalyser();
await getLocalLang();

@Injectable({
  global: true,
  scope: Scope.Operation,
})
export class PreflightScriptProvider {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: Storage,
    private session: Session,
    private idTranslator: IdTranslator,
    private auditLogs: AuditLogRecorder,
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
  ) {
    this.logger = logger.child({ source: 'PreflightScriptProvider' });
  }

  async getPreflightScript(targetId: string) {
    const result = await this.pool.maybeOne<unknown>(sql`/* getPreflightScript */
      SELECT
        "id"
        , "source_code"         AS "sourceCode"
        , "target_id"           AS "targetId"
        , "created_by_user_id"  AS "createdByUserId"
        , to_json("created_at") AS "createdAt"
        , to_json("updated_at") AS "updatedAt"
      FROM
        "document_preflight_scripts"
      WHERE
        "target_id" = ${targetId}
    `);

    if (!result) {
      return null;
    }

    return PreflightScriptModel.parse(result);
  }

  async updatePreflightScript(args: {
    selector: {
      organizationSlug: string;
      projectSlug: string;
      targetSlug: string;
    };
    sourceCode: string;
  }): Promise<
    | {
        error: { message: string };
        ok?: never;
      }
    | {
        error?: never;
        ok: {
          preflightScript: PreflightScript;
          updatedTarget: Target;
        };
      }
  > {
    const [organizationId, projectId, targetId] = await Promise.all([
      this.idTranslator.translateOrganizationId(args.selector),
      this.idTranslator.translateProjectId(args.selector),
      this.idTranslator.translateTargetId(args.selector),
    ]);

    await this.session.assertPerformAction({
      action: 'laboratory:modifyPreflightScript',
      organizationId,
      params: {
        organizationId,
        projectId,
        targetId,
      },
    });

    const validationResult = UpdatePreflightScriptModel.safeParse({ sourceCode: args.sourceCode });

    if (validationResult.error) {
      return {
        error: {
          message: validationResult.error.errors[0].message,
        },
      };
    }

    const currentUser = await this.session.getViewer();
    const result = await this.pool.maybeOne(sql`/* createPreflightScript */
      INSERT INTO "document_preflight_scripts" (
        "source_code"
        , "target_id"
        , "created_by_user_id")
      VALUES (
        ${validationResult.data.sourceCode}
        , ${targetId}
        , ${currentUser.id}
      )
      ON CONFLICT ("target_id") 
      DO UPDATE
        SET
          "source_code" = EXCLUDED."source_code"
          , "updated_at"  = NOW()
      RETURNING
          "id"
          , "source_code" AS "sourceCode"
          , "target_id" AS "targetId"
          , "created_by_user_id" AS "createdByUserId"
          , to_json("created_at") AS "createdAt"
          , to_json("updated_at") AS "updatedAt"
      `);

    if (!result) {
      return {
        error: {
          message: 'No preflight script found',
        },
      };
    }
    const { data: preflightScript, error } = PreflightScriptModel.safeParse(result);

    if (error) {
      return {
        error: {
          message: error.errors[0].message,
        },
      };
    }

    await this.auditLogs.record({
      eventType: 'PREFLIGHT_SCRIPT_CHANGED',
      organizationId,
      metadata: {
        scriptContents: preflightScript.sourceCode,
      },
    });

    const updatedTarget = await this.storage.getTarget({
      organizationId,
      projectId,
      targetId,
    });

    return {
      ok: {
        preflightScript,
        updatedTarget,
      },
    };
  }
}
