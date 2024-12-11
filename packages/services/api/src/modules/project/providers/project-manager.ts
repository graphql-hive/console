import { Injectable, Scope } from 'graphql-modules';
import type { Organization, Project, ProjectType } from '../../../shared/entities';
import { share } from '../../../shared/helpers';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { ActivityManager } from '../../shared/providers/activity-manager';
import { Logger } from '../../shared/providers/logger';
import { OrganizationSelector, ProjectSelector, Storage } from '../../shared/providers/storage';
import { TokenStorage } from '../../token/providers/token-storage';

const reservedSlugs = ['view', 'new'];

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
    private activityManager: ActivityManager,
    private auditLog: AuditLogRecorder,
  ) {
    this.logger = logger.child({ source: 'ProjectManager' });
  }

  async createProject(
    input: {
      slug: string;
      type: ProjectType;
    } & OrganizationSelector,
  ) {
    const { slug, type, organizationId: organization } = input;
    this.logger.info('Creating a project (input=%o)', input);

    await this.session.assertPerformAction({
      action: 'project:create',
      organizationId: organization,
      params: {
        organizationId: organization,
      },
    });

    if (reservedSlugs.includes(slug)) {
      return {
        ok: false,
        message: 'Slug is reserved',
      };
    }

    const result = await this.storage.createProject({
      slug,
      type,
      organizationId: organization,
    });

    if (result.ok) {
      await Promise.all([
        this.storage.completeGetStartedStep({
          organizationId: organization,
          step: 'creatingProject',
        }),
        this.activityManager.create({
          type: 'PROJECT_CREATED',
          selector: {
            organizationId: organization,
            projectId: result.project.id,
          },
          meta: {
            projectType: type,
          },
        }),
        this.auditLog.record({
          eventType: 'PROJECT_CREATED',
          organizationId: organization,
          metadata: {
            projectId: result.project.id,
            projectType: type,
            projectSlug: slug,
          },
        }),
      ]);
    }

    return result;
  }

  async deleteProject({
    organizationId: organization,
    projectId: project,
  }: ProjectSelector): Promise<Project> {
    this.logger.info('Deleting a project (project=%s, organization=%s)', project, organization);
    await this.session.assertPerformAction({
      action: 'project:delete',
      organizationId: organization,
      params: {
        organizationId: organization,
        projectId: project,
      },
    });

    const deletedProject = await this.storage.deleteProject({
      projectId: project,
      organizationId: organization,
    });
    await this.auditLog.record({
      eventType: 'PROJECT_DELETED',
      organizationId: organization,
      metadata: {
        projectId: deletedProject.id,
        projectSlug: deletedProject.slug,
      },
    });
    await this.tokenStorage.invalidateTokens(deletedProject.tokens);

    await this.activityManager.create({
      type: 'PROJECT_DELETED',
      selector: {
        organizationId: organization,
      },
      meta: {
        name: deletedProject.name,
        cleanId: deletedProject.slug,
      },
    });

    return deletedProject;
  }

  getProjectIdByToken: () => Promise<string | never> = share(async () => {
    const token = this.session.getLegacySelector();
    return token.projectId;
  });

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

  async updateSlug(
    input: {
      slug: string;
    } & ProjectSelector,
  ): Promise<
    | {
        ok: true;
        project: Project;
      }
    | {
        ok: false;
        message: string;
      }
  > {
    const { slug, organizationId: organization, projectId: project } = input;
    this.logger.info('Updating a project slug (input=%o)', input);
    await this.session.assertPerformAction({
      action: 'project:modifySettings',
      organizationId: organization,
      params: {
        organizationId: organization,
        projectId: project,
      },
    });

    const user = await this.session.getViewer();

    if (reservedSlugs.includes(slug)) {
      return {
        ok: false,
        message: 'Slug is reserved',
      };
    }

    const result = await this.storage.updateProjectSlug({
      organizationId: organization,
      projectId: project,
      userId: user.id,
      slug,
    });

    if (result.ok) {
      await this.activityManager.create({
        type: 'PROJECT_ID_UPDATED',
        selector: {
          organizationId: organization,
          projectId: project,
        },
        meta: {
          value: slug,
        },
      });
      await this.auditLog.record({
        eventType: 'PROJECT_SLUG_UPDATED',
        organizationId: organization,
        metadata: {
          previousSlug: slug,
          newSlug: result.project.slug,
        },
      });
    }

    return result;
  }
}
