import { Injectable, Scope } from 'graphql-modules';
import { TargetReferenceInput } from 'packages/libraries/core/src/client/__generated__/types';
import * as zod from 'zod';
import { z } from 'zod';
import * as GraphQLSchema from '../../../__generated__/types';
import type { Project, Target, TargetSettings } from '../../../shared/entities';
import { share } from '../../../shared/helpers';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { ProjectSelector, Storage, TargetSelector } from '../../shared/providers/storage';
import { TokenStorage } from '../../token/providers/token-storage';
import { PercentageModel, TargetSlugModel } from '../validation';
import { TargetsByIdCache } from './targets-by-id-cache';

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
            targets?: string;
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
            targets: validationResult.error.formErrors.fieldErrors.targets?.[0],
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
      targets: validationResult.data.targets ?? undefined,
      isEnabled: args.configuration.isEnabled ?? undefined,
    });

    return {
      ok: true,
      target: await this.getTargetById({ targetId: selector.targetId }),
    };
  }

  async updateSlug(
    input: {
      slug: string;
    } & TargetSelector,
  ): Promise<
    | {
        ok: true;
        target: Target;
      }
    | {
        ok: false;
        message: string;
      }
  > {
    const { slug, organizationId: organization, projectId: project, targetId: target } = input;
    this.logger.info('Updating a target slug (input=%o)', input);
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        targetId: input.targetId,
      },
    });

    const user = await this.session.getViewer();

    if (reservedSlugs.includes(slug)) {
      return {
        ok: false,
        message: 'Slug is reserved',
      };
    }

    const result = await this.storage.updateTargetSlug({
      slug,
      organizationId: organization,
      projectId: project,
      targetId: target,
      userId: user.id,
    });

    if (result.ok) {
      await this.auditLog.record({
        eventType: 'TARGET_SLUG_UPDATED',
        organizationId: organization,
        metadata: {
          projectId: project,
          targetId: target,
          newSlug: result.target.slug,
          previousSlug: slug,
        },
      });
    }

    return result;
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
}

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
  targets: z
    .array(z.string().uuid('Incorrect UUID provided.'))
    .min(1, 'At least one target must be provided.')
    .nullable()
    .optional(),
});
