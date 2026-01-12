import { Injectable, Scope } from 'graphql-modules';
import * as GraphQLSchema from 'packages/libraries/core/src/client/__generated__/types';
import { z } from 'zod';
import type { ProjectReferenceInput } from '../../../__generated__/types';
import type { Organization, Project, ProjectType, Target } from '../../../shared/entities';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { OrganizationSelector, ProjectSelector, Storage } from '../../shared/providers/storage';
import { TargetManager } from '../../target/providers/target-manager';
import { TokenStorage } from '../../token/providers/token-storage';
import { ProjectSlugModel } from '../validation';

const reservedSlugs = ['view', 'new'];

const CreateProjectModel = z.object({
  slug: ProjectSlugModel,
});

const UpdateProjectSlugModel = z.object({
  slug: ProjectSlugModel,
});

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class ProjectManager {
  private logger: Logger;

  constructor(
    logger: Logger,
    private storage: Storage,
    private session: Session,
    private tokenStorage: TokenStorage,
    private auditLog: AuditLogRecorder,
    private idTranslator: IdTranslator,
    private targetManager: TargetManager,
  ) {
    this.logger = logger.child({ source: 'ProjectManager' });
  }

  async createProject(input: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    slug: string;
    type: ProjectType;
  }) {
    this.logger.info('Creating a project (input=%o)', input);

    const inputParseResult = CreateProjectModel.safeParse(input);

    if (!inputParseResult.success) {
      return {
        ok: false as const,
        message: 'Please check your input.',
        inputErrors: {
          slug: inputParseResult.error.formErrors.fieldErrors.slug?.[0],
        },
      };
    }

    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: input.organization,
      onError: () => {
        this.session.raise('project:create');
      },
    });

    const { slug, type } = input;

    await this.session.assertPerformAction({
      action: 'project:create',
      organizationId,
      params: {
        organizationId,
      },
    });

    if (reservedSlugs.includes(slug)) {
      return {
        ok: false as const,
        message: 'Slug is reserved',
      };
    }

    const result = await this.storage.createProject({
      slug,
      type,
      organizationId,
    });

    if (result.ok) {
      await Promise.all([
        this.storage.completeGetStartedStep({
          organizationId,
          step: 'creatingProject',
        }),
        this.auditLog.record({
          eventType: 'PROJECT_CREATED',
          organizationId,
          metadata: {
            projectId: result.project.id,
            projectType: type,
            projectSlug: slug,
          },
        }),
      ]);

      const targetResults = await Promise.all([
        this.targetManager.createTarget({
          slug: 'production',
          project: {
            byId: result.project.id,
          },
        }),
        this.targetManager.createTarget({
          slug: 'staging',
          project: {
            byId: result.project.id,
          },
        }),
        this.targetManager.createTarget({
          slug: 'development',
          project: {
            byId: result.project.id,
          },
        }),
      ]);

      const targets: Target[] = [];
      for (const result of targetResults) {
        if (result.ok) {
          targets.push(result.target);
        } else {
          this.logger.error('Failed to create a target: ' + result.message);
        }
      }

      return {
        ok: true as const,
        project: result.project,
        targets,
      };
    }

    return result;
  }

  async deleteProject(args: { project: GraphQLSchema.ProjectReferenceInput }): Promise<Project> {
    this.logger.info('Deleting a project (reference=%o)', args.project);
    const selector = await this.idTranslator.resolveProjectReference({
      reference: args.project,
    });

    if (!selector) {
      this.session.raise('project:delete');
    }

    await this.session.assertPerformAction({
      action: 'project:delete',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    const deletedProject = await this.storage.deleteProject({
      projectId: selector.projectId,
      organizationId: selector.organizationId,
    });

    await this.auditLog.record({
      eventType: 'PROJECT_DELETED',
      organizationId: selector.organizationId,
      metadata: {
        projectId: deletedProject.id,
        projectSlug: deletedProject.slug,
      },
    });
    await this.tokenStorage.invalidateTokens(deletedProject.tokens);

    return deletedProject;
  }

  async getProject(selector: ProjectSelector): Promise<Project> {
    this.logger.debug('Fetching project (selector=%o)', selector);
    await this.session.assertPerformAction({
      action: 'project:describe',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    return this.storage.getProject(selector);
  }

  async getProjectByRereference(reference: ProjectReferenceInput): Promise<Project | null> {
    const selector = await this.idTranslator.resolveProjectReference({ reference });

    if (selector === null) {
      this.session.raise('project:describe');
    }

    return await this.getProject(selector);
  }

  async getProjectBySlugForOrganization(
    organization: Organization,
    projectSlug: string,
  ): Promise<Project | null> {
    const project = await this.storage.getProjectBySlug({
      organizationId: organization.id,
      slug: projectSlug,
    });

    if (!project) {
      return null;
    }

    const canViewerAccess = await this.session.canPerformAction({
      action: 'project:describe',
      organizationId: organization.id,
      params: {
        organizationId: organization.id,
        projectId: project.id,
      },
    });

    if (canViewerAccess === false) {
      return null;
    }

    return project;
  }

  async getProjects(selector: OrganizationSelector): Promise<Project[]> {
    this.logger.debug('Fetching projects (selector=%o)', selector);
    const projects = await this.storage.getProjects(selector);

    const filteredProjects: Project[] = [];

    for (const project of projects) {
      if (
        false ===
        (await this.session.canPerformAction({
          action: 'project:describe',
          organizationId: selector.organizationId,
          params: {
            organizationId: selector.organizationId,
            projectId: project.id,
          },
        }))
      ) {
        continue;
      }
      filteredProjects.push(project);
    }

    return filteredProjects;
  }

  async updateSlug(input: { project: GraphQLSchema.ProjectReferenceInput; slug: string }): Promise<
    | {
        ok: true;
        project: Project;
      }
    | {
        ok: false;
        message: string;
      }
  > {
    this.logger.info('Updating a project slug (input=%o)', input);
    const selector = await this.idTranslator.resolveProjectReference({ reference: input.project });
    if (!selector) {
      this.session.raise('project:modifySettings');
    }

    const { slug } = input;
    await this.session.assertPerformAction({
      action: 'project:modifySettings',
      organizationId: selector.organizationId,
      params: {
        organizationId: selector.organizationId,
        projectId: selector.projectId,
      },
    });

    const inputParseResult = UpdateProjectSlugModel.safeParse(input);

    if (!inputParseResult.success) {
      return {
        ok: false,
        message:
          inputParseResult.error.formErrors.fieldErrors.slug?.[0] ?? 'Please check your input.',
      };
    }

    if (reservedSlugs.includes(slug)) {
      return {
        ok: false,
        message: 'Slug is reserved',
      };
    }

    const result = await this.storage.updateProjectSlug({
      organizationId: selector.organizationId,
      projectId: selector.projectId,
      slug,
    });

    if (result.ok) {
      await this.auditLog.record({
        eventType: 'PROJECT_SLUG_UPDATED',
        organizationId: selector.organizationId,
        metadata: {
          previousSlug: slug,
          newSlug: result.project.slug,
        },
      });
    }

    return result;
  }
}
