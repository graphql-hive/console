import { Injectable, Scope } from 'graphql-modules';
import * as zod from 'zod';
import type { Project, Target, TargetSettings } from '../../../shared/entities';
import { share } from '../../../shared/helpers';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { ActivityManager } from '../../shared/providers/activity-manager';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { ProjectSelector, Storage, TargetSelector } from '../../shared/providers/storage';
import { TokenStorage } from '../../token/providers/token-storage';
import { HiveError } from './../../../shared/errors';

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
    private activityManager: ActivityManager,
    private idTranslator: IdTranslator,
    private auditLog: AuditLogRecorder,
  ) {
    this.logger = logger.child({ source: 'TargetManager' });
  }

  async createTarget({
    slug,
    projectId: project,
    organizationId: organization,
  }: {
    slug: string;
  } & ProjectSelector): Promise<
    | {
        ok: true;
        target: Target;
      }
    | {
        ok: false;
        message: string;
      }
  > {
    this.logger.info(
      'Creating a target (slug=%s, project=%s, organization=%s)',
      slug,
      project,
      organization,
    );
    await this.session.assertPerformAction({
      action: 'target:create',
      organizationId: organization,
      params: {
        organizationId: organization,
        projectId: project,
      },
    });

    if (reservedSlugs.includes(slug)) {
      return {
        ok: false,
        message: 'Slug is reserved',
      };
    }

    // create target
    const result = await this.storage.createTarget({
      slug,
      projectId: project,
      organizationId: organization,
    });

    if (result.ok) {
      await this.activityManager.create({
        type: 'TARGET_CREATED',
        selector: {
          organizationId: organization,
          projectId: project,
          targetId: result.target.id,
        },
      });

      await this.auditLog.record({
        eventType: 'TARGET_CREATED',
        organizationId: result.target.orgId,
        metadata: {
          projectId: result.target.projectId,
          targetId: result.target.id,
          targetSlug: result.target.slug,
        },
      });
    }

    return result;
  }

  async deleteTarget({
    organizationId: organization,
    projectId: project,
    targetId: target,
  }: TargetSelector): Promise<Target> {
    this.logger.info(
      'Deleting a target (target=%s, project=%s, organization=%s)',
      target,
      project,
      organization,
    );
    await this.session.assertPerformAction({
      action: 'target:delete',
      organizationId: organization,
      params: {
        organizationId: organization,
        projectId: project,
        targetId: target,
      },
    });

    const deletedTarget = await this.storage.deleteTarget({
      targetId: target,
      projectId: project,
      organizationId: organization,
    });
    await this.tokenStorage.invalidateTokens(deletedTarget.tokens);

    await this.activityManager.create({
      type: 'TARGET_DELETED',
      selector: {
        organizationId: organization,
        projectId: project,
      },
      meta: {
        name: deletedTarget.name,
        cleanId: deletedTarget.slug,
      },
    });

    await this.auditLog.record({
      eventType: 'TARGET_DELETED',
      organizationId: organization,
      metadata: {
        targetId: target,
        targetSlug: deletedTarget.slug,
        projectId: project,
      },
    });

    return deletedTarget;
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

  async getTargetBySlugForProject(project: Project, targetSlug: string) {
    return await this.storage.getTargetBySlug({
      slug: targetSlug,
      organizationId: project.orgId,
      projectId: project.id,
    });
  }

  getTargetIdByToken: () => Promise<string | never> = share(async () => {
    const selector = this.session.getLegacySelector();
    const { target } = await this.tokenStorage.getToken({ token: selector.token });

    return target;
  });

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

    const settings = await this.storage.getTargetSettings(selector);
    return {
      ...settings,
      validation: {
        ...settings.validation,
        breakingChangeFormula: settings.validation.breakingChangeFormula || 'PERCENTAGE',
        requestCount: settings.validation.requestCount || 1,
      },
    };
  }

  async setTargetValidation(
    input: {
      enabled: boolean;
    } & TargetSelector,
  ): Promise<TargetSettings['validation']> {
    this.logger.debug('Setting target validation (input=%o)', input);
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        targetId: input.targetId,
      },
    });

    await this.storage.completeGetStartedStep({
      organizationId: input.organizationId,
      step: 'enablingUsageBasedBreakingChanges',
    });

    return this.storage.setTargetValidation(input);
  }

  async updateTargetValidationSettings(
    input: Omit<TargetSettings['validation'], 'enabled'> & TargetSelector,
  ): Promise<TargetSettings['validation']> {
    this.logger.debug('Updating target validation settings (input=%o)', input);
    await this.session.assertPerformAction({
      action: 'target:modifySettings',
      organizationId: input.organizationId,
      params: {
        organizationId: input.organizationId,
        projectId: input.projectId,
        targetId: input.targetId,
      },
    });

    if (input.targets.length === 0) {
      throw new HiveError(`No targets specified. Required at least one target`);
    }

    return this.storage.updateTargetValidationSettings(input);
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
      await this.activityManager.create({
        type: 'TARGET_ID_UPDATED',
        selector: {
          organizationId: organization,
          projectId: project,
          targetId: target,
        },
        meta: {
          value: slug,
        },
      });

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
    organizationId: string;
    projectId: string;
    targetId: string;
    graphqlEndpointUrl: string | null;
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

    const graphqlEndpointUrl = TargetGraphQLEndpointUrlModel.safeParse(args.graphqlEndpointUrl);

    if (graphqlEndpointUrl.success === false) {
      return {
        type: 'error',
        reason: graphqlEndpointUrl.error.message,
      } as const;
    }

    const target = await this.storage.updateTargetGraphQLEndpointUrl({
      organizationId: args.organizationId,
      targetId: args.targetId,
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
      organizationId: args.organizationId,
      metadata: {
        projectId: args.projectId,
        targetId: args.targetId,
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
