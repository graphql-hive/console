import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql, TaggedTemplateLiteralInvocation } from '@hive/postgres';
import { FeatureFlagsModel, TargetBreadcrumbModel } from '@hive/storage';
import type { Target } from '../../../shared/entities';
import { batch, batchBy } from '../../../shared/helpers';
import { GraphStore } from '../../graph/providers/graph-store';
import { Logger } from '../../shared/providers/logger';

@Injectable({
  scope: Scope.Singleton,
  global: true,
})
export class TargetStore {
  private logger: Logger;

  constructor(
    logger: Logger,
    private graphStore: GraphStore,
    private pg: PostgresDatabasePool,
  ) {
    this.logger = logger.child({ source: 'TargetStore' });
  }

  async getTargetId(selector: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
  }) {
    const result = await this.pg
      .maybeOne(
        psql`/* getTargetId (slug) */
        SELECT t.id FROM targets as t
        LEFT JOIN projects AS p ON (p.id = t.project_id)
        LEFT JOIN organizations AS o ON (o.id = p.org_id)
        WHERE
          t.clean_id = ${selector.targetSlug} AND
          p.clean_id = ${selector.projectSlug} AND
          o.clean_id = ${selector.organizationSlug} AND
          p.type != 'CUSTOM'
        LIMIT 1
      `,
      )
      .then(z.object({ id: z.string() }).parse);

    return result.id;
  }

  async createTarget(args: { organizationId: string; projectId: string; slug: string }) {
    return this.pg.transaction('createTarget', async trx => {
      const targetSlugExists = await trx.exists(psql`/* targetSlugExists */
        SELECT 1 FROM targets WHERE clean_id = ${args.slug} AND project_id = ${args.projectId} LIMIT 1
      `);

      if (targetSlugExists) {
        return { ok: false, message: 'Target slug is already taken' } as const;
      }

      const result = await trx.maybeOne(psql`/* createTarget */
        INSERT INTO targets (name, clean_id, project_id)
        VALUES (${args.slug}, ${args.slug}, ${args.projectId})
        RETURNING ${targetFields}
      `);

      const target = { ...TargetModel.parse(result), orgId: args.organizationId };

      const defaultGraph = await this.graphStore.createGraph(
        {
          name: 'default',
          config: null,
          organizationId: args.organizationId,
          projectId: args.projectId,
          targetId: target.id,
          sourceGraphId: null,
        },
        trx,
      );

      return {
        ok: true,
        target,
        defaultGraph,
      } as const;
    });
  }

  async updateTargetSlug(args: {
    slug: string;
    organizationId: string;
    projectId: string;
    targetId: string;
  }) {
    return this.pg.transaction('updateTargetSlug', async trx => {
      const targetSlugExists = await trx.exists(psql`/* targetSlugExists */
        SELECT 1 FROM targets
        WHERE clean_id = ${args.slug} AND id != ${args.targetId} AND project_id = ${args.projectId}
        LIMIT 1
      `);

      if (targetSlugExists) {
        return { ok: false, message: 'Target slug is already taken' } as const;
      }

      const result = await trx
        .maybeOne(
          psql`/* updateTargetSlug */
          UPDATE targets
          SET clean_id = ${args.slug}, name = ${args.slug}
          WHERE id = ${args.targetId} AND project_id = ${args.projectId}
          RETURNING ${targetFields}
        `,
        )
        .then(TargetModel.parse);

      return {
        ok: true,
        target: { ...result, orgId: args.organizationId },
      } as const;
    });
  }

  async deleteTarget(args: { organizationId: string; projectId: string; targetId: string }) {
    const result = await this.pg.transaction('deleteTarget', async trx => {
      const tokens = await trx
        .any(
          psql`/* findTokensForDeletion */
          SELECT token FROM tokens WHERE target_id = ${args.targetId} AND deleted_at IS NULL
        `,
        )
        .then(z.array(z.object({ token: z.string() })).parse);
      const target = await trx
        .maybeOne(
          psql`/* deleteTarget */
          DELETE FROM targets WHERE id = ${args.targetId} RETURNING ${targetFields}
        `,
        )
        .then(TargetModel.parse);

      await trx.query(psql`/* deleteTargetSchemaVersions */
        DELETE FROM schema_versions WHERE target_id = ${args.targetId}
      `);

      return { target, tokens: tokens.map(row => row.token) };
    });

    return { ...result.target, orgId: args.organizationId, tokens: result.tokens };
  }

  getTarget = batch(
    async (selectors: Array<{ organizationId: string; projectId: string; targetId: string }>) => {
      const uniqueSelectors = Array.from(
        new Map(
          selectors.map(selector => [`${selector.projectId}:${selector.targetId}`, selector]),
        ).values(),
      );
      const rows = await this.pg
        .any(
          psql`/* getTarget */
          SELECT ${targetFields} FROM targets
          WHERE (id, project_id) IN ((${psql.join(
            uniqueSelectors.map(selector => psql`${selector.targetId}, ${selector.projectId}`),
            psql.fragment`), (`,
          )}))
        `,
        )
        .then(z.array(TargetModel).parse);

      return selectors.map(selector => {
        const row = rows.find(
          target => target.id === selector.targetId && target.projectId === selector.projectId,
        );
        if (!row) {
          return Promise.reject(
            new Error(
              `Target not found (target=${selector.targetId}, project=${selector.projectId})`,
            ),
          );
        }
        return Promise.resolve({ ...row, orgId: selector.organizationId });
      });
    },
  );

  async getTargetBySlug(args: { organizationId: string; projectId: string; slug: string }) {
    const result = await this.pg.maybeOne(psql`/* getTargetBySlug */
      SELECT ${targetFields} FROM targets
      WHERE clean_id = ${args.slug} AND project_id = ${args.projectId}
      LIMIT 1
    `);

    return result ? { ...TargetModel.parse(result), orgId: args.organizationId } : null;
  }

  async getTargets(args: { organizationId: string; projectId: string }) {
    const results = await this.pg
      .any(
        psql`/* getTargets */
        SELECT ${targetFields} FROM targets
        WHERE project_id = ${args.projectId}
        ORDER BY created_at DESC
      `,
      )
      .then(z.array(TargetModel).parse);

    return results.map(target => ({ ...target, orgId: args.organizationId }));
  }

  findTargetsByIds = batchBy<
    { organizationId: string; targetIds: Array<string> },
    Map<string, Target>
  >(
    args => args.organizationId,
    async args => {
      const targetIds = args.flatMap(arg => arg.targetIds);
      const lookup = new Map<string, Target>();
      if (targetIds.length === 0) return args.map(async () => lookup);

      const results = await this.pg
        .any(
          psql`/* findTargetsByIds */
          SELECT ${targetFields} FROM targets
          WHERE id = ANY(${psql.array(targetIds, 'uuid')})
        `,
        )
        .then(z.array(TargetModel).parse);
      for (const row of results) lookup.set(row.id, { ...row, orgId: args[0].organizationId });

      return args.map(async arg => {
        const result = new Map<string, Target>();
        for (const id of arg.targetIds) {
          const target = lookup.get(id);
          if (target) result.set(id, target);
        }
        return result;
      });
    },
  );

  async getTargetIdsOfOrganization(args: { organizationId: string }) {
    const results = await this.pg
      .any(
        psql`/* getTargetIdsOfOrganization */
        SELECT t.id FROM targets AS t
        LEFT JOIN projects AS p ON (p.id = t.project_id)
        WHERE p.org_id = ${args.organizationId}
        GROUP BY t.id
      `,
      )
      .then(z.array(TargetIdModel).parse);
    return results.map(row => row.id);
  }

  async getTargetIdsOfProject(args: { organizationId?: string; projectId: string }) {
    const results = await this.pg
      .any(
        psql`/* getTargetIdsOfProject */
        SELECT id FROM targets WHERE project_id = ${args.projectId}
      `,
      )
      .then(z.array(TargetIdModel).parse);
    return results.map(row => row.id);
  }

  async getTargetSettings(args: { organizationId?: string; targetId: string; projectId: string }) {
    return this.pg
      .maybeOne(
        psql`/* getTargetSettings */
        SELECT
          ${targetSettingsFields(psql`t.`)},
          array_agg(DISTINCT tv.destination_target_id)
            FILTER (WHERE tv.destination_target_id IS NOT NULL) AS "targets"
        FROM targets AS t
        LEFT JOIN target_validation AS tv ON (tv.target_id = t.id)
        WHERE t.id = ${args.targetId} AND t.project_id = ${args.projectId}
        GROUP BY t.id
        LIMIT 1
      `,
      )
      .then(TargetSettingsModel.parse);
  }

  async updateTargetDangerousChangeClassification(args: {
    targetId: string;
    projectId: string;
    failDiffOnDangerousChange: boolean;
  }) {
    return this.pg
      .transaction('updateTargetDangerousChangeClassification', trx =>
        trx.maybeOne(psql`/* updateTargetDangerousChangeClassification */
          UPDATE targets AS t
          SET fail_diff_on_dangerous_change = ${args.failDiffOnDangerousChange}
          FROM (
            SELECT it.id,
              array_agg(DISTINCT tv.destination_target_id)
                FILTER (WHERE tv.destination_target_id IS NOT NULL) AS "targets"
            FROM targets AS it
            LEFT JOIN target_validation AS tv ON (tv.target_id = it.id)
            WHERE it.id = ${args.targetId} AND it.project_id = ${args.projectId}
            GROUP BY it.id
            LIMIT 1
          ) ret
          WHERE t.id = ret.id
          RETURNING ${targetSettingsFields(psql`t.`)}, ret.targets
        `),
      )
      .then(TargetSettingsModel.parse);
  }

  async updateTargetFailingDangerousChanges(args: {
    targetId: string;
    projectId: string;
    all: boolean;
    failingTypes: readonly string[];
  }) {
    await this.pg.query(psql`/* updateTargetFailingDangerousChanges */
      UPDATE targets
      SET fail_all_dangerous_changes = ${args.all},
        fail_dangerous_change_types = ${psql.array(args.failingTypes, 'text')}
      WHERE id = ${args.targetId} AND project_id = ${args.projectId}
    `);
  }

  async updateTargetValidationSettings(args: {
    organizationId?: string;
    targetId: string;
    projectId: string;
    percentage?: number;
    period?: number;
    targets?: readonly string[];
    excludedClients?: readonly string[];
    excludedAppDeployments?: readonly string[];
    breakingChangeFormula?: string;
    requestCount?: number;
    isEnabled?: boolean;
  }) {
    return (
      await this.pg
        .transaction('updateTargetValidationSettings', async trx => {
          if (args.targets) {
            await trx.query(psql`/* deleteTargetValidation */
              DELETE FROM target_validation
              WHERE destination_target_id NOT IN (${psql.join(args.targets, psql.fragment`, `)})
                AND target_id = ${args.targetId}
            `);
            await trx.query(psql`/* insertTargetValidation */
              INSERT INTO target_validation (target_id, destination_target_id)
              VALUES (${psql.join(
                args.targets.map(destination =>
                  psql.join([args.targetId, destination], psql.fragment`, `),
                ),
                psql.fragment`), (`,
              )})
              ON CONFLICT (target_id, destination_target_id) DO NOTHING
            `);
          } else if (
            !(await trx.exists(psql`/* findTargetValidation */
              SELECT 1 FROM target_validation WHERE target_id = ${args.targetId}
            `))
          ) {
            await trx.query(psql`/* insertTargetValidation */
              INSERT INTO target_validation (target_id, destination_target_id)
              VALUES (${args.targetId}, ${args.targetId})
            `);
          }

          return trx.maybeOne(psql`/* updateTargetValidationSettings */
            UPDATE targets AS t
            SET validation_percentage = COALESCE(${args.percentage ?? null}, validation_percentage),
              validation_period = COALESCE(${args.period ?? null}, validation_period),
              validation_excluded_clients = COALESCE(${args.excludedClients?.length ? psql.array(args.excludedClients, 'text') : null}, validation_excluded_clients),
              validation_excluded_app_deployments = COALESCE(${args.excludedAppDeployments?.length ? psql.array(args.excludedAppDeployments, 'text') : null}, validation_excluded_app_deployments),
              validation_request_count = COALESCE(${args.requestCount ?? null}, validation_request_count),
              validation_breaking_change_formula = COALESCE(${args.breakingChangeFormula ?? null}, validation_breaking_change_formula),
              validation_enabled = COALESCE(${args.isEnabled ?? null}, validation_enabled)
            FROM (
              SELECT it.id,
                array_agg(tv.destination_target_id)
                  FILTER (WHERE tv.destination_target_id IS NOT NULL) AS "targets"
              FROM targets AS it
              LEFT JOIN target_validation AS tv ON (tv.target_id = it.id)
              WHERE it.id = ${args.targetId} AND it.project_id = ${args.projectId}
              GROUP BY it.id
              LIMIT 1
            ) ret
            WHERE t.id = ret.id
            RETURNING ${targetSettingsFields(psql`t.`)}, ret.targets
          `);
        })
        .then(TargetSettingsModel.parse)
    ).validation;
  }

  async updateTargetAppDeploymentProtectionSettings(args: {
    targetId: string;
    projectId: string;
    isEnabled?: boolean | null;
    minDaysInactive?: number | null;
    minDaysSinceCreation?: number | null;
    maxTrafficPercentage?: number | null;
    trafficPeriodDays?: number | null;
    ruleLogic?: 'AND' | 'OR' | null;
  }) {
    return this.pg
      .maybeOne(
        psql`/* updateTargetAppDeploymentProtectionSettings */
        UPDATE targets
        SET app_deployment_protection_enabled = COALESCE(${args.isEnabled ?? null}, app_deployment_protection_enabled),
          app_deployment_protection_min_days_inactive = COALESCE(${args.minDaysInactive ?? null}, app_deployment_protection_min_days_inactive),
          app_deployment_protection_max_traffic_percentage = COALESCE(${args.maxTrafficPercentage ?? null}, app_deployment_protection_max_traffic_percentage),
          app_deployment_protection_traffic_period_days = COALESCE(${args.trafficPeriodDays ?? null}, app_deployment_protection_traffic_period_days),
          app_deployment_protection_min_days_since_creation = COALESCE(${args.minDaysSinceCreation ?? null}, app_deployment_protection_min_days_since_creation),
          app_deployment_protection_rule_logic = COALESCE(${args.ruleLogic ?? null}, app_deployment_protection_rule_logic)
        WHERE id = ${args.targetId} AND project_id = ${args.projectId}
        RETURNING ${targetSettingsFields(psql``)}, null AS targets
      `,
      )
      .then(TargetSettingsModel.parse)
      .then(settings => settings.appDeploymentProtection);
  }

  async getTargetBreadcrumbForTargetId(args: { targetId: string }) {
    const result = await this.pg.maybeOne(psql`/* getTargetBreadcrumbForTargetId */
      SELECT o.clean_id AS organization_slug, p.clean_id AS project_slug, t.clean_id AS target_slug
      FROM targets t
      INNER JOIN projects p ON t.project_id = p.id
      INNER JOIN organizations o ON p.org_id = o.id
      WHERE t.id = ${args.targetId}
    `);
    return result === null ? null : TargetBreadcrumbModel.parse(result);
  }

  private getTargetByIdBatched = batch(async (targetIds: string[]) => {
    const rows = await this.pg
      .any(
        psql`/* getTargetById */
        SELECT t.*, p.org_id AS "orgId"
        FROM (SELECT ${targetFields} FROM targets WHERE id = ANY(${psql.array(targetIds, 'uuid')})) AS t
        INNER JOIN projects p ON t."projectId" = p.id
      `,
      )
      .then(z.array(TargetWithOrgIdModel).parse);
    const lookup = new Map(rows.map(target => [target.id, target]));
    return targetIds.map(async id => lookup.get(id) ?? null);
  });

  getTargetById(targetId: string) {
    return this.getTargetByIdBatched(targetId);
  }

  async getTargetBySlugPath(args: {
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
  }) {
    const result = await this.pg.maybeOne(psql`/* getTargetBySlugPath */
      SELECT t.*, p.org_id AS "orgId"
      FROM (
        SELECT ${targetFields} FROM targets WHERE clean_id = ${args.targetSlug}
      ) AS t
      INNER JOIN projects p ON t."projectId" = p.id
      INNER JOIN organizations o ON p.org_id = o.id
      WHERE p.clean_id = ${args.projectSlug} AND o.clean_id = ${args.organizationSlug}
    `);
    return result === null ? null : TargetWithOrgIdModel.parse(result);
  }

  async updateTargetGraphQLEndpointUrl(args: {
    organizationId: string;
    targetId: string;
    graphqlEndpointUrl: string | null;
  }) {
    const result = await this.pg.maybeOne(psql`/* updateTargetGraphQLEndpointUrl */
      UPDATE targets SET graphql_endpoint_url = ${args.graphqlEndpointUrl}
      WHERE id = ${args.targetId}
      RETURNING ${targetFields}
    `);
    return result === null ? null : { ...TargetModel.parse(result), orgId: args.organizationId };
  }

  async updateTargetSchemaComposition(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    nativeComposition: boolean;
  }) {
    await this.pg.transaction('updateTargetSchemaComposition', async trx => {
      const featureFlags = await trx
        .maybeOneFirst(
          psql`/* updateTargetSchemaComposition_select */
          SELECT feature_flags FROM organizations WHERE id = ${args.organizationId}
        `,
        )
        .then(FeatureFlagsModel.parse);
      const includesTarget = featureFlags.forceLegacyCompositionInTargets.includes(args.targetId);

      if (args.nativeComposition && includesTarget) {
        featureFlags.forceLegacyCompositionInTargets =
          featureFlags.forceLegacyCompositionInTargets.filter(id => id !== args.targetId);
      } else if (!args.nativeComposition && !includesTarget) {
        featureFlags.forceLegacyCompositionInTargets.push(args.targetId);
      } else {
        return;
      }

      await trx.query(psql`/* updateTargetSchemaComposition_update */
        UPDATE organizations SET feature_flags = ${psql.jsonb(featureFlags)}
        WHERE id = ${args.organizationId}
      `);
    });

    return this.getTarget({
      organizationId: args.organizationId,
      projectId: args.projectId,
      targetId: args.targetId,
    });
  }
}

const targetFields = psql`
  id,
  clean_id AS slug,
  name,
  project_id AS "projectId",
  graphql_endpoint_url AS "graphqlEndpointUrl",
  fail_diff_on_dangerous_change AS "failDiffOnDangerousChange",
  fail_all_dangerous_changes AS "failAllDangerousChanges",
  fail_dangerous_change_types AS "failDangerousChangeTypes"
`;

const TargetModel = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  projectId: z.string(),
  graphqlEndpointUrl: z.string().nullable(),
  failDiffOnDangerousChange: z.boolean(),
  failAllDangerousChanges: z.boolean(),
  failDangerousChangeTypes: z.array(z.string()),
});
const TargetWithOrgIdModel = TargetModel.extend({ orgId: z.string() });
const TargetIdModel = z.object({ id: z.string() });

const targetSettingsFields = (prefix: TaggedTemplateLiteralInvocation) => psql`
  ${prefix}validation_enabled AS "validationEnabled",
  ${prefix}validation_percentage AS "validationPercentage",
  ${prefix}validation_period AS "validationPeriod",
  ${prefix}validation_excluded_clients AS "validationExcludedClients",
  ${prefix}validation_excluded_app_deployments AS "validationExcludedAppDeployments",
  ${prefix}validation_request_count AS "validationRequestCount",
  ${prefix}validation_breaking_change_formula AS "validationBreakingChangeFormula",
  ${prefix}fail_diff_on_dangerous_change AS "failDiffOnDangerousChange",
  ${prefix}fail_all_dangerous_changes AS "failAllDangerousChanges",
  ${prefix}fail_dangerous_change_types AS "failDangerousChangeTypes",
  ${prefix}app_deployment_protection_enabled AS "appDeploymentProtectionEnabled",
  ${prefix}app_deployment_protection_min_days_inactive AS "appDeploymentProtectionMinDaysInactive",
  ${prefix}app_deployment_protection_min_days_since_creation AS "appDeploymentProtectionMinDaysSinceCreation",
  ${prefix}app_deployment_protection_max_traffic_percentage AS "appDeploymentProtectionMaxTrafficPercentage",
  ${prefix}app_deployment_protection_traffic_period_days AS "appDeploymentProtectionTrafficPeriodDays",
  ${prefix}app_deployment_protection_rule_logic AS "appDeploymentProtectionRuleLogic"
`;

const TargetSettingsModel = z
  .object({
    validationEnabled: z.boolean(),
    validationPercentage: z.number(),
    validationPeriod: z.number(),
    validationExcludedClients: z.array(z.string()).nullable(),
    validationExcludedAppDeployments: z.array(z.string()).nullable(),
    validationRequestCount: z.number().nullable(),
    validationBreakingChangeFormula: z.string().nullable(),
    failDiffOnDangerousChange: z.boolean(),
    failAllDangerousChanges: z.boolean(),
    failDangerousChangeTypes: z.array(z.any()),
    targets: z.array(z.string()).nullable(),
    appDeploymentProtectionEnabled: z.boolean(),
    appDeploymentProtectionMinDaysInactive: z.number(),
    appDeploymentProtectionMinDaysSinceCreation: z.number(),
    appDeploymentProtectionMaxTrafficPercentage: z.coerce.number(),
    appDeploymentProtectionTrafficPeriodDays: z.number(),
    appDeploymentProtectionRuleLogic: z.enum(['AND', 'OR']),
  })
  .transform(row => ({
    failDiffOnDangerousChange: row.failDiffOnDangerousChange,
    failAllDangerousChanges: row.failAllDangerousChanges,
    failDangerousChangeTypes: row.failDangerousChangeTypes,
    validation: {
      isEnabled: row.validationEnabled,
      percentage: row.validationPercentage,
      period: row.validationPeriod,
      requestCount: row.validationRequestCount ?? 1,
      breakingChangeFormula: (row.validationBreakingChangeFormula ?? 'PERCENTAGE') as
        | 'PERCENTAGE'
        | 'REQUEST_COUNT',
      targets: row.targets ?? [],
      excludedClients: row.validationExcludedClients ?? [],
      excludedAppDeployments: row.validationExcludedAppDeployments ?? [],
    },
    appDeploymentProtection: {
      isEnabled: row.appDeploymentProtectionEnabled,
      minDaysInactive: row.appDeploymentProtectionMinDaysInactive,
      minDaysSinceCreation: row.appDeploymentProtectionMinDaysSinceCreation,
      maxTrafficPercentage: row.appDeploymentProtectionMaxTrafficPercentage,
      trafficPeriodDays: row.appDeploymentProtectionTrafficPeriodDays,
      ruleLogic: row.appDeploymentProtectionRuleLogic,
    },
  }));
