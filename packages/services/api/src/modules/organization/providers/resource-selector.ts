import { Injectable, Scope } from 'graphql-modules';
import { sql } from 'slonik';
import { AccessError } from '@hive/api/shared/errors';
import * as GraphQLSchema from '../../../__generated__/types';
import { Organization, ProjectType } from '../../../shared/entities';
import { Session } from '../../auth/lib/authz';
import { Storage } from '../../shared/providers/storage';

/**
 * Responsible for auth checks.
 * Talks to Storage.
 */
@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class ResourceSelector {
  constructor(
    private storage: Storage,
    private session: Session,
  ) {}

  private async _assertResourceSelectorAdminPermissions(organizationId: string) {
    const canDos = await Promise.all([
      this.session.canPerformAction({
        organizationId,
        action: 'member:modify',
        params: {
          organizationId,
        },
      }),
      this.session.canPerformAction({
        organizationId,
        action: 'oidc:modify',
        params: {
          organizationId,
        },
      }),
      this.session.canPerformAction({
        organizationId,
        action: 'accessToken:modify',
        params: {
          organizationId,
        },
      }),
    ]);

    if (!canDos.some(canDo => canDo)) {
      throw new AccessError('Insufficient permissions.');
    }
  }

  async getProjectsFromOrganizationForResourceSelector(
    organization: Organization,
    intent: GraphQLSchema.ResourceSelectorIntentType,
  ) {
    let projects = await this.storage.getProjects({ organizationId: organization.id });

    if (intent === 'ADMIN') {
      await this._assertResourceSelectorAdminPermissions(organization.id);
    } else {
      const filteredProjects: typeof projects = [];
      for (const project of projects) {
        if (
          false ===
          (await this.session.canPerformAction({
            action: 'project:describe',
            organizationId: project.orgId,
            params: {
              organizationId: project.orgId,
              projectId: project.id,
            },
          }))
        ) {
          continue;
        }
        filteredProjects.push(project);
      }
      projects = filteredProjects;
    }

    return projects.map(project => ({
      projectId: project.id,
      organizationId: project.orgId,
      slug: project.slug,
      type: project.type,
    }));
  }

  async getProjectFromOrganizationForResourceSelector(
    organization: Organization,
    projectId: string,
    intent: GraphQLSchema.ResourceSelectorIntentType,
  ) {
    const project = await this.storage.getProjectById(projectId);

    if (!project) {
      return null;
    }

    if (intent === 'ADMIN') {
      await this._assertResourceSelectorAdminPermissions(organization.id);
    } else {
      // otherwise: default check if user has access on this resource
      await this.session.assertPerformAction({
        action: 'project:describe',
        organizationId: organization.id,
        params: {
          organizationId: organization.id,
          projectId: project.id,
        },
      });
    }

    if (!project || project.orgId !== organization.id) {
      return null;
    }

    return {
      projectId: project.id,
      organizationId: project.orgId,
      slug: project.slug,
      type: project.type,
    };
  }

  async getTargetsFromOrganizationForResourceSelector(project: ProjectForResourceSelector) {
    const targets = await this.storage.getTargets({
      organizationId: project.organizationId,
      projectId: project.projectId,
    });

    return targets.map(target => ({
      ...project,
      targetId: target.id,
      slug: target.slug,
    }));
  }

  async getTargetFromOrganizationForResourceSelector(
    project: ProjectForResourceSelector,
    targetId: string,
  ) {
    const target = await this.storage.getTargetById(targetId);

    if (!target) {
      return null;
    }

    return {
      ...project,
      targetId: target.id,
      slug: target.slug,
    };
  }

  async getServicesFromTargetForResourceSelector(target: TargetForResourceSelector) {
    if (target.type === GraphQLSchema.ProjectType.SINGLE) {
      return null;
    }
    const latest = await this.storage.getMaybeLatestValidVersion({ targetId: target.targetId });
    if (latest) {
      return await this.storage.pool.manyFirst<string>(
        sql`/* getServicesFromTargetForResourceSelector */
          SELECT
            lower(sl.service_name) as service_name
          FROM schema_version_to_log AS svl
          LEFT JOIN schema_log AS sl ON (sl.id = svl.action_id)
          LEFT JOIN projects as p ON (p.id = sl.project_id)
          WHERE
            svl.version_id = ${latest.id}
            AND sl.action = 'PUSH'
            AND p.type != 'CUSTOM'
          ORDER BY
            sl.created_at DESC
        `,
      );
    }

    return [];
  }

  async getAppDeploymentsFromTargetForResourceSelector(target: TargetForResourceSelector) {
    const apps = await this.storage.pool.manyFirst<string>(
      sql`
        SELECT DISTINCT ON ("name")
          "name"
        FROM
          "app_deployments"
        WHERE
          "target_id" = ${target.targetId}
          AND "retired_at" IS NULL
      `,
    );

    return apps;
  }
}

export type ProjectForResourceSelector = {
  projectId: string;
  organizationId: string;
  slug: string;
  type: ProjectType;
};

export type TargetForResourceSelector = {
  projectId: string;
  organizationId: string;
  targetId: string;
  slug: string;
  type: ProjectType;
};
