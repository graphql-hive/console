import { GraphQLError } from 'graphql';
import { Injectable, Scope } from 'graphql-modules';
import { TargetReferenceInput } from 'packages/libraries/core/src/client/__generated__/types';
import * as zod from 'zod';
import { z } from 'zod';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  decodeProjectSlugIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
  encodeProjectSlugIdBasedCursor,
} from '@hive/storage';
import type { DateRangeInput } from '../../../__generated__/types';
import * as GraphQLSchema from '../../../__generated__/types';
import type { Project, Target, TargetSettings } from '../../../shared/entities';
import { parseDateRangeInput, share } from '../../../shared/helpers';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { OperationsManager } from '../../operations/providers/operations-manager';
import { SchemaVersionStore } from '../../schema/providers/schema-version-store';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import {
  ProjectSelector,
  Storage,
  TargetSelector,
  TargetsStorageSort,
} from '../../shared/providers/storage';
import { TokenStorage } from '../../token/providers/token-storage';
import { PercentageModel, TargetSlugModel } from '../validation';
import { TargetsByIdCache } from './targets-by-id-cache';

type TargetsSortArgs = {
  field: 'NAME' | 'CREATED_AT' | 'REQUESTS' | 'SCHEMA_VERSIONS';
  direction: 'ASC' | 'DESC';
  period?: DateRangeInput | null;
};

const reservedSlugs = ['view', 'new'];

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class TargetManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: Storage,
    private tokenStorage: TokenStorage,
    private session: Session,
    private idTranslator: IdTranslator,
    private auditLog: AuditLogRecorder,
    private targetsCache: TargetsByIdCache,
    private operationsManager: OperationsManager,
    private schemaVersions: SchemaVersionStore,
  ) {
    this.logger = logger.child({ source: 'TargetManager' });
  }

  async createTarget(args: { project: GraphQLSchema.ProjectReferenceInput; slug: string }): Promise<
    | {
        ok: true;
        target: Target;
        selector: {
          organizationSlug: string;
          projectSlug: string;
          targetSlug: string;
        };
      }
    | {
        ok: false;
        message: string;
        inputErrors?: {
          slug?: string | null;
        } | null;
      }
  > {
    this.logger.info('Creating a target (slug=%s, project=%o)', args.slug, args.project);

    const selector = await this.idTranslator.resolveProjectReference({
      reference: args.project,
    });

    if (!selector) {
      this.session.raise('target:create');
    }

    await this.session.assertPerformAction({
      action: 'target:create',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    if (reservedSlugs.includes(args.slug)) {
      return {
        ok: false,
        message: 'Slug is reserved',
        inputErrors: {
          slug: 'Slug is reserved',
        },
      };
    }

    const inputParseResult = TargetSlugModel.safeParse(args.slug);
    if (!inputParseResult.success) {
      return {
        ok: false,
        message: 'Check your input.',
        inputErrors: {
          slug: inputParseResult.error.issues[0].message ?? null,
        },
      };
    }

    // create target
    const result = await this.storage.createTarget({
      slug: args.slug,
      projectId: selector.projectId,
      organizationId: selector.organizationId,
    });

    if (!result.ok) {
      return result;
    }

    await this.auditLog.record({
      eventType: 'TARGET_CREATED',
      organizationId: result.target.orgId,
      metadata: {
        projectId: result.target.projectId,
        targetId: result.target.id,
        targetSlug: result.target.slug,
      },
    });

    const [project, organization] = await Promise.all([
      this.storage.getProjectById(selector.projectId),
      this.storage.getOrganization({ organizationId: selector.organizationId }),
    ]);

    if (!project) {
      throw new Error('This should not happen.');
    }

    return {
      ...result,
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: inputParseResult.data,
      },
    };
  }

  async deleteTarget(args: { target: GraphQLSchema.TargetReferenceInput }): Promise<{
    deletedTarget: Target;
    selector: {
      organizationSlug: string;
      projectSlug: string;
      targetSlug: string;
    };
  }> {
    this.logger.info('Deleting a target (target=%o)', args.target);
    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });
    if (!selector) {
      this.session.raise('target:delete');
    }

    await this.session.assertPerformAction({
      action: 'target:delete',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    const deletedTarget = await this.storage.deleteTarget({
      targetId: selector.targetId,
      projectId: selector.projectId,
      organizationId: selector.organizationId,
    });
    await this.tokenStorage.invalidateTokens(deletedTarget.tokens);

    await this.auditLog.record({
      eventType: 'TARGET_DELETED',
      organizationId: selector.organizationId,
      metadata: {
        targetId: selector.targetId,
        targetSlug: deletedTarget.slug,
        projectId: selector.projectId,
      },
    });

    await this.targetsCache.purge(deletedTarget);

    const [project, organization] = await Promise.all([
      this.storage.getProjectById(selector.projectId),
      this.storage.getOrganization({ organizationId: selector.organizationId }),
    ]);

    if (!project) {
      throw new Error('This should not happen.');
    }

    return {
      deletedTarget,
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: deletedTarget.slug,
      },
    };
  }

  async getTargets(selector: ProjectSelector): Promise<readonly Target[]> {
    this.logger.debug('Fetching targets (selector=%o)', selector);
    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    return this.storage.getTargets(selector);
  }

  async getPaginatedTargetsForProject(
    project: Project,
    args: {
      first: number | null;
      after: string | null;
      search: string | null;
      sort: TargetsSortArgs | null;
    },
  ) {
    return this.getPaginatedTargets(
      {
        organizationId: project.orgId,
        projectId: project.id,
      },
      args,
    );
  }

  async getPaginatedTargets(
    selector: ProjectSelector,
    args: {
      first: number | null;
      after: string | null;
      search: string | null;
      sort: TargetsSortArgs | null;
    },
  ) {
    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    const sortField = args.sort?.field ?? 'CREATED_AT';

    if (sortField === 'REQUESTS' || sortField === 'SCHEMA_VERSIONS') {
      return this.getPaginatedTargetsSortedByMetric(selector, args);
    }

    const storageSort = this.toStorageSort(args.sort);
    const limit = args.first ? Math.min(args.first, 50) : null;

    if (limit === null) {
      const targets = await this.storage.getTargets({
        ...selector,
        search: args.search,
        sort: storageSort,
      });
      const nodes = targets.slice(this.resolveCursorStartIndex(targets, args.after, storageSort));

      return this.toTargetConnection(nodes, storageSort, {
        hasNextPage: false,
        hasPreviousPage: args.after !== null,
      });
    }

    return this.storage.getPaginatedTargets({
      ...selector,
      first: limit,
      after: args.after,
      search: args.search,
      sort: storageSort,
    });
  }

  private async getPaginatedTargetsSortedByMetric(
    selector: ProjectSelector,
    args: {
      first: number | null;
      after: string | null;
      search: string | null;
      sort: TargetsSortArgs | null;
    },
  ) {
    if (!args.sort?.period) {
      throw new GraphQLError(
        'period is required when sorting targets by REQUESTS or SCHEMA_VERSIONS',
      );
    }

    const period = parseDateRangeInput(args.sort.period);
    const limit = args.first ? Math.min(args.first, 50) : null;
    const direction = args.sort.direction ?? 'DESC';
    const multiplier = direction === 'ASC' ? 1 : -1;

    const targets = await this.storage.getTargets({
      ...selector,
      search: args.search,
    });

    const withMetrics =
      args.sort.field === 'REQUESTS'
        ? await this.operationsManager
            .countRequestsByTargetIds({
              organizationId: selector.organizationId,
              projectId: selector.projectId,
              targetIds: targets.map(target => target.id),
              period,
            })
            .then(counts =>
              targets.map(target => ({
                target,
                value: counts.get(target.id) ?? 0,
              })),
            )
        : await Promise.all(
            targets.map(async target => {
              const value = await this.schemaVersions.countSchemaVersionsOfTarget(target, period);

              return { target, value };
            }),
          );

    withMetrics.sort((left, right) => {
      const diff = (left.value - right.value) * multiplier;

      if (diff !== 0) {
        return diff;
      }

      return left.target.slug.localeCompare(right.target.slug);
    });

    const sorted = withMetrics.map(entry => entry.target);
    let startIndex = 0;

    if (args.after) {
      const { id } = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
      const cursorIndex = sorted.findIndex(target => target.id === id);

      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    if (limit === null) {
      return this.toTargetConnection(sorted.slice(startIndex), null, {
        hasNextPage: false,
        hasPreviousPage: args.after !== null,
      });
    }

    const page = sorted.slice(startIndex, startIndex + limit + 1);

    return this.toTargetConnection(page.slice(0, limit), null, {
      hasNextPage: page.length > limit,
      hasPreviousPage: args.after !== null,
    });
  }

  private resolveCursorStartIndex(
    targets: readonly Target[],
    after: string | null,
    sort: TargetsStorageSort | null,
  ) {
    if (!after) {
      return 0;
    }

    const sortConfig = sort ?? { field: 'CREATED_AT', direction: 'DESC' };
    const isDesc = sortConfig.direction === 'DESC';
    const cursorIndex = targets.findIndex(target => {
      if (sortConfig.field === 'NAME') {
        try {
          const cursor = decodeProjectSlugIdBasedCursor(after);

          return target.slug === cursor.slug && target.id === cursor.id;
        } catch {
          return false;
        }
      }

      try {
        const cursor = decodeCreatedAtAndUUIDIdBasedCursor(after);

        return target.createdAt === cursor.createdAt && target.id === cursor.id;
      } catch {
        return false;
      }
    });

    if (cursorIndex !== -1) {
      return cursorIndex + 1;
    }

    if (sortConfig.field === 'NAME') {
      try {
        const cursor = decodeProjectSlugIdBasedCursor(after);
        const startIndex = targets.findIndex(target =>
          isDesc
            ? target.slug < cursor.slug || (target.slug === cursor.slug && target.id < cursor.id)
            : target.slug > cursor.slug || (target.slug === cursor.slug && target.id > cursor.id),
        );

        return startIndex === -1 ? targets.length : startIndex;
      } catch {
        return 0;
      }
    }

    try {
      const cursor = decodeCreatedAtAndUUIDIdBasedCursor(after);
      const startIndex = targets.findIndex(target =>
        isDesc
          ? target.createdAt < cursor.createdAt ||
            (target.createdAt === cursor.createdAt && target.id < cursor.id)
          : target.createdAt > cursor.createdAt ||
            (target.createdAt === cursor.createdAt && target.id > cursor.id),
      );

      return startIndex === -1 ? targets.length : startIndex;
    } catch {
      return 0;
    }
  }

  private toStorageSort(sort: TargetsSortArgs | null): TargetsStorageSort | null {
    if (!sort) {
      return null;
    }

    return {
      field: sort.field === 'NAME' ? 'NAME' : 'CREATED_AT',
      direction: sort.direction,
    };
  }

  private toTargetConnection(
    nodes: readonly Target[],
    sort: TargetsStorageSort | null,
    pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean },
  ) {
    const sortConfig = sort ?? { field: 'CREATED_AT', direction: 'DESC' };
    const edges = nodes.map(node => ({
      node,
      get cursor() {
        if (sortConfig.field === 'NAME') {
          return encodeProjectSlugIdBasedCursor({ slug: node.slug, id: node.id });
        }

        return encodeCreatedAtAndUUIDIdBasedCursor(node);
      },
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: pageInfo.hasNextPage,
        hasPreviousPage: pageInfo.hasPreviousPage,
        get endCursor() {
          return edges.at(-1)?.cursor ?? '';
        },
        get startCursor() {
          return edges.at(0)?.cursor ?? '';
        },
      },
    };
  }

  async getTarget(selector: TargetSelector): Promise<Target> {
    this.logger.debug('Fetching target (selector=%o)', selector);
    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });
    return this.storage.getTarget(selector);
  }

  async getTargetByReferenceInput(reference: TargetReferenceInput) {
    const selector = await this.idTranslator.resolveTargetReference({ reference });

    if (!selector) {
      this.session.raise('project:describe');
    }
    return this.getTarget(selector);
  }

  async getTargetBySlugForProject(project: Project, targetSlug: string) {
    return await this.storage.getTargetBySlug({
      slug: targetSlug,
      organizationId: project.orgId,
      projectId: project.id,
    });
  }

  getTargetFromToken: () => Promise<Target | never> = share(async () => {
    const selector = this.session.getLegacySelector();
    const { target, project, organization } = await this.tokenStorage.getToken({
      token: selector.token,
    });

    return this.storage.getTarget({
      organizationId: organization,
      projectId: project,
      targetId: target,
    });
  });

  async getTargetSettings(selector: TargetSelector): Promise<TargetSettings> {
    this.logger.debug('Fetching target settings (selector=%o)', selector);
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    return this.storage.getTargetSettings(selector);
  }

  async updateTargetDangerousChangeClassification(args: {
    target: GraphQLSchema.TargetReferenceInput;
    failDiffOnDangerousChange: boolean;
  }): Promise<Target> {
    this.logger.debug('Updating target dangerous change classification (target=%o)', args.target);
    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });

    if (!selector) {
      this.session.raise('target:modifySettings');
    }

    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    await this.storage.updateTargetDangerousChangeClassification({
      ...selector,
      failDiffOnDangerousChange: args.failDiffOnDangerousChange,
    });

    return this.getTarget(selector);
  }

  async updateTargetConditionalBreakingChangeConfiguration(args: {
    target: GraphQLSchema.TargetReferenceInput;
    configuration: GraphQLSchema.ConditionalBreakingChangeConfigurationInput;
  }): Promise<
    | {
        ok: true;
        target: Target;
      }
    | {
        ok: false;
        error: {
          message: string;
          inputErrors: {
            period?: string;
            percentage?: string;
            requestCount?: string;
            targetIds?: string;
          };
        };
      }
  > {
    this.logger.debug(
      'Updating target validation settings (target=%o, configuration=%o)',
      args.target,
      args.configuration,
    );

    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });
    if (!selector) {
      this.session.raise('target:modifySettings');
    }

    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    const org = await this.storage.getOrganization({ organizationId: selector.organizationId });

    const validationResult = BreakingChangeConfigurationModel.extend({
      period: z
        .number()
        .min(1)
        .max(org.monthlyRateLimit.retentionInDays)
        .int()
        .nullable()
        .optional(),
    }).safeParse(args.configuration);

    if (validationResult.success === false) {
      return {
        ok: false,
        error: {
          message: 'Please check your input.',
          inputErrors: {
            period: validationResult.error.formErrors.fieldErrors.period?.[0],
            percentage: validationResult.error.formErrors.fieldErrors.percentage?.[0],
            requestCount: validationResult.error.formErrors.fieldErrors.requestCount?.[0],
            targetIds: validationResult.error.formErrors.fieldErrors.targetIds?.[0],
          },
        },
      };
    }

    if (args.configuration.isEnabled === true) {
      await this.storage.completeGetStartedStep({
        organizationId: selector.organizationId,
        step: 'enablingUsageBasedBreakingChanges',
      });
    }

    await this.storage.updateTargetValidationSettings({
      organizationId: selector.organizationId,
      projectId: selector.projectId,
      targetId: selector.targetId,
      period: validationResult.data.period ?? undefined,
      percentage: validationResult.data.percentage ?? undefined,
      requestCount: validationResult.data.requestCount ?? undefined,
      breakingChangeFormula: args.configuration.breakingChangeFormula ?? undefined,
      excludedClients: args.configuration.excludedClients?.length
        ? Array.from(args.configuration.excludedClients)
        : undefined,
      excludedAppDeployments: args.configuration.excludedAppDeployments?.length
        ? Array.from(args.configuration.excludedAppDeployments)
        : undefined,
      targets: validationResult.data.targetIds ?? undefined,
      isEnabled: args.configuration.isEnabled ?? undefined,
    });

    return {
      ok: true,
      target: await this.getTargetById({ targetId: selector.targetId }),
    };
  }

  async updateSlug(args: { target: GraphQLSchema.TargetReferenceInput; slug: string }): Promise<
    | {
        ok: true;
        target: Target;
        selector: GraphQLSchema.TargetSelectorInput;
      }
    | {
        ok: false;
        message: string;
      }
  > {
    this.logger.info('Updating a target slug (input=%o)', args);
    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });
    if (!selector) {
      this.session.raise('target:modifySettings');
    }
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    if (reservedSlugs.includes(args.slug)) {
      return {
        ok: false,
        message: 'Slug is reserved',
      };
    }

    const slugParseResult = TargetSlugModel.safeParse(args.slug);
    if (!slugParseResult.success) {
      return {
        ok: false,
        message: slugParseResult.error.formErrors.formErrors?.[0] ?? 'Please check your input.',
      };
    }

    const result = await this.storage.updateTargetSlug({
      slug: slugParseResult.data,
      organizationId: selector.organizationId,
      projectId: selector.projectId,
      targetId: selector.targetId,
    });

    if (!result.ok) {
      return result;
    }

    await this.auditLog.record({
      eventType: 'TARGET_SLUG_UPDATED',
      organizationId: selector.organizationId,
      metadata: {
        projectId: selector.projectId,
        targetId: selector.targetId,
        newSlug: result.target.slug,
        previousSlug: slugParseResult.data,
      },
    });

    const [project, organization] = await Promise.all([
      this.storage.getProjectById(selector.projectId),
      this.storage.getOrganization({ organizationId: selector.organizationId }),
    ]);

    if (!project) {
      throw new Error('This should not happen.');
    }

    return {
      ...result,
      selector: {
        organizationSlug: organization.slug,
        projectSlug: project.slug,
        targetSlug: slugParseResult.data,
      },
    };
  }

  async updateTargetGraphQLEndpointUrl(args: {
    target: GraphQLSchema.TargetReferenceInput;
    graphqlEndpointUrl: string | null;
  }) {
    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });
    if (!selector) {
      this.session.raise('target:modifySettings');
    }

    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    const graphqlEndpointUrl = TargetGraphQLEndpointUrlModel.safeParse(args.graphqlEndpointUrl);

    if (graphqlEndpointUrl.success === false) {
      return {
        type: 'error',
        reason: graphqlEndpointUrl.error.message,
      } as const;
    }

    const target = await this.storage.updateTargetGraphQLEndpointUrl({
      organizationId: selector.organizationId,
      targetId: selector.targetId,
      graphqlEndpointUrl: graphqlEndpointUrl.data,
    });

    if (!target) {
      return {
        type: 'error',
        reason: 'Target not found.',
      } as const;
    }

    await this.auditLog.record({
      eventType: 'TARGET_GRAPHQL_ENDPOINT_URL_UPDATED',
      organizationId: selector.organizationId,
      metadata: {
        projectId: selector.projectId,
        targetId: selector.targetId,
        graphqlEndpointUrl: args.graphqlEndpointUrl,
      },
    });

    return {
      type: 'ok',
      target,
    } as const;
  }

  async getTargetById(args: { targetId: string }): Promise<Target> {
    const breadcrumb = await this.storage.getTargetBreadcrumbForTargetId({
      targetId: args.targetId,
    });

    if (!breadcrumb) {
      throw new Error(`Target not found (targetId=${args.targetId})`);
    }

    const [organizationId, projectId] = await Promise.all([
      this.idTranslator.translateOrganizationId(breadcrumb),
      this.idTranslator.translateProjectId(breadcrumb),
    ]);

    return this.storage.getTarget({
      organizationId: organizationId,
      projectId: projectId,
      targetId: args.targetId,
    });
  }

  /**
   * @deprecated It's a temporary method to force legacy composition in targets, when native composition is enabled for a project.
   */
  async updateTargetSchemaComposition(args: {
    organizationId: string;
    projectId: string;
    targetId: string;
    nativeComposition: boolean;
  }) {
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: args.organizationId,
      params: {
        organizationId: args.organizationId,
        projectId: args.projectId,
        targetId: args.targetId,
      },
    });

    this.logger.info(
      `Updating target schema composition (targetId=%s, nativeComposition=%s)`,
      args.targetId,
      args.nativeComposition,
    );

    const target = await this.storage.updateTargetSchemaComposition({
      organizationId: args.organizationId,
      projectId: args.projectId,
      targetId: args.targetId,
      nativeComposition: args.nativeComposition,
    });

    await this.auditLog.record({
      eventType: 'TARGET_SCHEMA_COMPOSITION_UPDATED',
      organizationId: args.organizationId,
      metadata: {
        projectId: args.projectId,
        targetId: args.targetId,
        nativeComposition: args.nativeComposition,
      },
    });

    return target;
  }

  async updateTargetAppDeploymentProtectionConfiguration(args: {
    target: GraphQLSchema.TargetReferenceInput;
    configuration: GraphQLSchema.AppDeploymentProtectionConfigurationInput;
  }): Promise<
    | {
        ok: true;
        target: Target;
      }
    | {
        ok: false;
        error: {
          message: string;
          inputErrors: {
            minDaysInactive?: string;
            minDaysSinceCreation?: string;
            maxTrafficPercentage?: string;
            trafficPeriodDays?: string;
          };
        };
      }
  > {
    this.logger.debug(
      'Updating target app deployment protection settings (target=%o, configuration=%o)',
      args.target,
      args.configuration,
    );

    const selector = await this.idTranslator.resolveTargetReference({ reference: args.target });
    if (!selector) {
      this.session.raise('target:modifySettings');
    }

    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
        targetId: selector.targetId,
      },
    });

    const validationResult = AppDeploymentProtectionConfigurationModel.safeParse(
      args.configuration,
    );

    if (validationResult.success === false) {
      return {
        ok: false,
        error: {
          message: 'Please check your input.',
          inputErrors: {
            minDaysInactive: validationResult.error.formErrors.fieldErrors.minDaysInactive?.[0],
            minDaysSinceCreation:
              validationResult.error.formErrors.fieldErrors.minDaysSinceCreation?.[0],
            maxTrafficPercentage:
              validationResult.error.formErrors.fieldErrors.maxTrafficPercentage?.[0],
            trafficPeriodDays: validationResult.error.formErrors.fieldErrors.trafficPeriodDays?.[0],
          },
        },
      };
    }

    await this.storage.updateTargetAppDeploymentProtectionSettings({
      projectId: selector.projectId,
      targetId: selector.targetId,
      isEnabled: args.configuration.isEnabled ?? undefined,
      minDaysInactive: validationResult.data.minDaysInactive ?? undefined,
      minDaysSinceCreation: validationResult.data.minDaysSinceCreation ?? undefined,
      maxTrafficPercentage: validationResult.data.maxTrafficPercentage ?? undefined,
      trafficPeriodDays: validationResult.data.trafficPeriodDays ?? undefined,
      ruleLogic: args.configuration.ruleLogic ?? undefined,
    });

    return {
      ok: true,
      target: await this.getTargetById({ targetId: selector.targetId }),
    };
  }
}

const AppDeploymentProtectionConfigurationModel = z.object({
  minDaysInactive: z
    .number()
    .min(0, 'Minimum days inactive must be at least 0.')
    .nullable()
    .optional(),
  minDaysSinceCreation: z
    .number()
    .min(0, 'Minimum days since creation must be at least 0.')
    .nullable()
    .optional(),
  maxTrafficPercentage: z
    .number()
    .min(0, 'Maximum traffic percentage must be at least 0.')
    .max(100, 'Maximum traffic percentage must be at most 100.')
    .nullable()
    .optional(),
  trafficPeriodDays: z
    .number()
    .min(1, 'Traffic period days must be at least 1.')
    .nullable()
    .optional(),
});

const TargetGraphQLEndpointUrlModel = zod
  .string()
  .max(300, {
    message: 'Must be less than 300 characters.',
  })
  .url()
  .nullable();

const BreakingChangeConfigurationModel = z.object({
  percentage: PercentageModel.nullable().optional(),
  requestCount: z.number().min(1, 'Request count must be at least 1.').nullable().optional(),
  targetIds: z
    .array(z.string().uuid('Incorrect UUID provided.'))
    .min(1, 'At least one target must be provided.')
    .nullable()
    .optional(),
});
