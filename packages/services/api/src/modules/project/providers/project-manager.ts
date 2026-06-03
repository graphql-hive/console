import { Injectable, Scope } from 'graphql-modules';
import * as GraphQLSchema from 'packages/libraries/core/src/client/__generated__/types';
import { z } from 'zod';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  decodeProjectSlugIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
  encodeProjectSlugIdBasedCursor,
} from '@hive/storage';
import type { DateRangeInput, ProjectReferenceInput } from '../../../__generated__/types';
import type { Organization, Project, ProjectType, Target } from '../../../shared/entities';
import { HiveError } from '../../../shared/errors';
import { cache, parseDateRangeInput } from '../../../shared/helpers';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import { Session } from '../../auth/lib/authz';
import { OperationsManager } from '../../operations/providers/operations-manager';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import {
  OrganizationSelector,
  ProjectSelector,
  ProjectsStorageSort,
  Storage,
} from '../../shared/providers/storage';
import { TargetManager } from '../../target/providers/target-manager';
import { TokenStorage } from '../../token/providers/token-storage';
import { ProjectSlugModel } from '../validation';
import { ProjectStats } from './project-stats';

type ProjectsSortArgs = {
  field: 'NAME' | 'CREATED_AT' | 'REQUESTS' | 'SCHEMA_VERSIONS';
  direction: 'ASC' | 'DESC';
  period?: DateRangeInput | null;
};

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
    private operationsManager: OperationsManager,
    private projectStats: ProjectStats,
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

  @cache((projectId: string) => projectId)
  async getProjectById(projectId: string): Promise<Project> {
    this.logger.debug('Fetching project by id (projectId=%s)', projectId);
    const project = await this.storage.getProjectById(projectId);
    if (!project) {
      throw new Error('Could not find project.');
    }
    return project;
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

  async getPaginatedProjectsForOrganization(
    organization: Organization,
    args: {
      first: number | null;
      after: string | null;
      search: string | null;
      sort: ProjectsSortArgs | null;
    },
  ) {
    const sortField = args.sort?.field ?? 'CREATED_AT';

    if (sortField === 'REQUESTS' || sortField === 'SCHEMA_VERSIONS') {
      return this.getPaginatedProjectsSortedByMetric(organization, args);
    }

    const storageSort = this.toStorageSort(args.sort);
    const limit = args.first ? Math.min(args.first, 50) : null;

    if (limit === null) {
      const projects = await this.storage.getProjects({
        organizationId: organization.id,
        search: args.search,
        sort: storageSort,
      });
      const authorized = await this.filterAuthorizedProjects(organization, projects);
      const nodes = authorized.slice(
        this.resolveCursorStartIndex(authorized, args.after, storageSort),
      );

      return this.toProjectConnection(nodes, storageSort, {
        hasNextPage: false,
        hasPreviousPage: args.after !== null,
      });
    }

    const authorized: Project[] = [];
    let dbCursor = args.after;
    let dbHasMore = true;

    while (authorized.length <= limit && dbHasMore) {
      const batch = await this.storage.getPaginatedProjects({
        organizationId: organization.id,
        first: limit + 1,
        after: dbCursor,
        search: args.search,
        sort: storageSort,
      });

      for (const { node: project } of batch.edges) {
        if (
          await this.session.canPerformAction({
            action: 'project:describe',
            organizationId: organization.id,
            params: {
              organizationId: organization.id,
              projectId: project.id,
            },
          })
        ) {
          authorized.push(project);
        }

        if (authorized.length > limit) {
          break;
        }
      }

      dbHasMore = batch.pageInfo.hasNextPage;
      dbCursor = batch.pageInfo.endCursor;

      if (batch.edges.length === 0) {
        break;
      }
    }

    return this.toProjectConnection(authorized.slice(0, limit), storageSort, {
      hasNextPage: authorized.length > limit,
      hasPreviousPage: args.after !== null,
    });
  }

  private async getPaginatedProjectsSortedByMetric(
    organization: Organization,
    args: {
      first: number | null;
      after: string | null;
      search: string | null;
      sort: ProjectsSortArgs | null;
    },
  ) {
    if (!args.sort?.period) {
      throw new HiveError(
        'period is required when sorting projects by REQUESTS or SCHEMA_VERSIONS',
      );
    }

    const period = parseDateRangeInput(args.sort.period);
    const limit = args.first ? Math.min(args.first, 50) : null;
    const direction = args.sort.direction ?? 'DESC';
    const multiplier = direction === 'ASC' ? 1 : -1;

    const projects = await this.storage.getProjects({
      organizationId: organization.id,
      search: args.search,
    });
    const authorized = await this.filterAuthorizedProjects(organization, projects);

    const withMetrics =
      args.sort.field === 'REQUESTS'
        ? await this.projectStats
            .getTargetIdsByProjectIds({
              organizationId: organization.id,
              projectIds: authorized.map(project => project.id),
            })
            .then(async targetIdsByProjectId => {
              const countsByTargetId =
                await this.operationsManager.countRequestsByTargetIdsOfOrganization({
                  organizationId: organization.id,
                  targetIds: Array.from(targetIdsByProjectId.values()).flat(),
                  period,
                });

              return authorized.map(project => ({
                project,
                value: (targetIdsByProjectId.get(project.id) ?? []).reduce(
                  (total, targetId) => total + (countsByTargetId.get(targetId) ?? 0),
                  0,
                ),
              }));
            })
        : await this.projectStats
            .countSchemaVersionsByProjectIds({
              organizationId: organization.id,
              projectIds: authorized.map(project => project.id),
              period,
            })
            .then(counts =>
              authorized.map(project => ({
                project,
                value: counts.get(project.id) ?? 0,
              })),
            );

    withMetrics.sort((left, right) => {
      const diff = (left.value - right.value) * multiplier;

      if (diff !== 0) {
        return diff;
      }

      return left.project.slug.localeCompare(right.project.slug);
    });

    const sorted = withMetrics.map(entry => entry.project);
    let startIndex = 0;

    if (args.after) {
      const { id } = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
      const cursorIndex = sorted.findIndex(project => project.id === id);

      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    if (limit === null) {
      return this.toProjectConnection(sorted.slice(startIndex), null, {
        hasNextPage: false,
        hasPreviousPage: args.after !== null,
      });
    }

    const page = sorted.slice(startIndex, startIndex + limit + 1);

    return this.toProjectConnection(page.slice(0, limit), null, {
      hasNextPage: page.length > limit,
      hasPreviousPage: args.after !== null,
    });
  }

  private async filterAuthorizedProjects(organization: Organization, projects: Project[]) {
    const filteredProjects: Project[] = [];

    for (const project of projects) {
      if (
        await this.session.canPerformAction({
          action: 'project:describe',
          organizationId: organization.id,
          params: {
            organizationId: organization.id,
            projectId: project.id,
          },
        })
      ) {
        filteredProjects.push(project);
      }
    }

    return filteredProjects;
  }

  private resolveCursorStartIndex(
    projects: Project[],
    after: string | null,
    sort: ProjectsStorageSort | null,
  ) {
    if (!after) {
      return 0;
    }

    const sortConfig = sort ?? { field: 'CREATED_AT', direction: 'DESC' };
    const isDesc = sortConfig.direction === 'DESC';
    const cursorIndex = projects.findIndex(project => {
      if (sortConfig.field === 'NAME') {
        try {
          const cursor = decodeProjectSlugIdBasedCursor(after);

          return project.slug === cursor.slug && project.id === cursor.id;
        } catch {
          throw new HiveError('Invalid cursor');
        }
      }

      try {
        const cursor = decodeCreatedAtAndUUIDIdBasedCursor(after);

        return project.createdAt === cursor.createdAt && project.id === cursor.id;
      } catch {
        throw new HiveError('Invalid cursor');
      }
    });

    if (cursorIndex !== -1) {
      return cursorIndex + 1;
    }

    if (sortConfig.field === 'NAME') {
      try {
        const cursor = decodeProjectSlugIdBasedCursor(after);
        const startIndex = projects.findIndex(project =>
          isDesc
            ? project.slug < cursor.slug || (project.slug === cursor.slug && project.id < cursor.id)
            : project.slug > cursor.slug ||
              (project.slug === cursor.slug && project.id > cursor.id),
        );

        return startIndex === -1 ? projects.length : startIndex;
      } catch {
        throw new HiveError('Invalid cursor');
      }
    }

    try {
      const cursor = decodeCreatedAtAndUUIDIdBasedCursor(after);
      const startIndex = projects.findIndex(project =>
        isDesc
          ? project.createdAt < cursor.createdAt ||
            (project.createdAt === cursor.createdAt && project.id < cursor.id)
          : project.createdAt > cursor.createdAt ||
            (project.createdAt === cursor.createdAt && project.id > cursor.id),
      );

      return startIndex === -1 ? projects.length : startIndex;
    } catch {
      throw new HiveError('Invalid cursor');
    }
  }

  private toStorageSort(sort: ProjectsSortArgs | null): ProjectsStorageSort | null {
    if (!sort) {
      return null;
    }

    return {
      field: sort.field === 'NAME' ? 'NAME' : 'CREATED_AT',
      direction: sort.direction,
    };
  }

  private toProjectConnection(
    nodes: Project[],
    sort: ProjectsStorageSort | null,
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
