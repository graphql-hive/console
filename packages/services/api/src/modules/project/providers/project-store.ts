import { Injectable, Scope } from 'graphql-modules';
import { z } from 'zod';
import { PostgresDatabasePool, psql, TaggedTemplateLiteralInvocation } from '@hive/postgres';
import type { Project } from '../../../shared/entities';
import { ProjectType } from '../../../shared/entities';
import { batch } from '../../../shared/helpers';
import { Logger } from '../../shared/providers/logger';

@Injectable({
  scope: Scope.Operation,
  global: true,
})
export class ProjectStore {
  private logger: Logger;

  constructor(
    logger: Logger,
    private pg: PostgresDatabasePool,
  ) {
    this.logger = logger.child({ source: 'ProjectStore' });
  }

  async createProject(args: { organizationId: string; slug: string; type: ProjectType }) {
    return this.pg.transaction('createProject', async trx => {
      const projectSlugExists = await trx.exists(psql`/* projectSlugExists */
        SELECT 1 FROM projects
        WHERE clean_id = ${args.slug} AND org_id = ${args.organizationId}
        LIMIT 1
      `);

      if (projectSlugExists) {
        return {
          ok: false,
          message: 'Project slug is already taken',
          inputErrors: undefined,
        } as const;
      }

      const project = await trx
        .maybeOne(
          psql`/* createProject */
          INSERT INTO projects (name, clean_id, type, org_id, native_federation)
          VALUES (
            ${args.slug},
            ${args.slug},
            ${args.type},
            ${args.organizationId},
            ${args.type === ProjectType.FEDERATION}
          )
          RETURNING ${projectFields()}
        `,
        )
        .then(ProjectModel.parse);

      return { ok: true, project } as const;
    });
  }

  async getProjectId(args: { projectSlug: string; organizationSlug: string }) {
    const result = await this.pg
      .maybeOne(
        psql`/* getProjectId */
        SELECT p.id
        FROM projects AS p
        LEFT JOIN organizations AS org ON p.org_id = org.id
        WHERE p.clean_id = ${args.projectSlug}
          AND org.clean_id = ${args.organizationSlug}
          AND p.type != 'CUSTOM'
        LIMIT 1
      `,
      )
      .then(z.object({ id: z.string() }).parse);

    return result.id;
  }

  async getProject(args: { organizationId?: string; projectId: string }) {
    return this.pg
      .maybeOne(
        psql`/* getProject */
        SELECT ${projectFields()} FROM projects
        WHERE id = ${args.projectId} AND type != 'CUSTOM'
        LIMIT 1
      `,
      )
      .then(ProjectModel.parse);
  }

  async getProjectBySlug(args: { slug: string; organizationId: string }) {
    return this.pg
      .maybeOne(
        psql`/* getProjectBySlug */
        SELECT ${projectFields()} FROM projects
        WHERE clean_id = ${args.slug}
          AND org_id = ${args.organizationId}
          AND type != 'CUSTOM'
        LIMIT 1
      `,
      )
      .then(ProjectModel.nullable().parse);
  }

  async getProjects(args: { organizationId: string }) {
    return this.pg
      .any(
        psql`/* getProjects */
        SELECT ${projectFields()} FROM projects
        WHERE org_id = ${args.organizationId} AND type != 'CUSTOM'
        ORDER BY created_at DESC
      `,
      )
      .then(z.array(ProjectModel).parse);
  }

  findProjectsByIds = batch<{ projectIds: Array<string> }, Map<string, Project>>(async args => {
    const projectIds = args.flatMap(arg => arg.projectIds);
    const lookup = new Map<string, Project>();
    if (projectIds.length === 0) return args.map(async () => lookup);

    const projects = await this.pg
      .any(
        psql`/* findProjectsByIds */
        SELECT ${projectFields()} FROM projects
        WHERE id = ANY(${psql.array(projectIds, 'uuid')}) AND type != 'CUSTOM'
      `,
      )
      .then(z.array(ProjectModel).parse);
    for (const project of projects) lookup.set(project.id, project);

    return args.map(async arg => {
      const result = new Map<string, Project>();
      for (const id of arg.projectIds) {
        const project = lookup.get(id);
        if (project) result.set(id, project);
      }
      return result;
    });
  });

  async getProjectById(projectId: string) {
    return (await this.findProjectsByIds({ projectIds: [projectId] })).get(projectId) ?? null;
  }

  async updateProjectSlug(args: { slug: string; organizationId: string; projectId: string }) {
    return this.pg.transaction('updateProjectSlug', async trx => {
      const projectSlugExists = await trx.exists(psql`/* projectSlugExists */
        SELECT 1 FROM projects
        WHERE clean_id = ${args.slug}
          AND id != ${args.projectId}
          AND org_id = ${args.organizationId}
        LIMIT 1
      `);

      if (projectSlugExists) {
        return { ok: false, message: 'Project slug is already taken' } as const;
      }

      const project = await trx
        .maybeOne(
          psql`/* updateProjectSlug */
          UPDATE projects
          SET clean_id = ${args.slug}, name = ${args.slug}
          WHERE id = ${args.projectId} AND org_id = ${args.organizationId}
          RETURNING ${projectFields()}
        `,
        )
        .then(ProjectModel.parse);

      return { ok: true, project } as const;
    });
  }

  async updateNativeSchemaComposition(args: {
    organizationId?: string;
    projectId: string;
    enabled: boolean;
  }) {
    return this.pg
      .maybeOne(
        psql`/* updateNativeSchemaComposition */
        UPDATE projects
        SET native_federation = ${args.enabled}, external_composition_enabled = FALSE
        WHERE id = ${args.projectId}
        RETURNING ${projectFields()}
      `,
      )
      .then(ProjectModel.parse);
  }

  async enableExternalSchemaComposition(args: {
    organizationId?: string;
    projectId: string;
    endpoint: string;
    encryptedSecret: string;
  }) {
    return this.pg
      .maybeOne(
        psql`/* enableExternalSchemaComposition */
        UPDATE projects
        SET native_federation = FALSE,
          external_composition_enabled = TRUE,
          external_composition_endpoint = ${args.endpoint},
          external_composition_secret = ${args.encryptedSecret}
        WHERE id = ${args.projectId}
        RETURNING ${projectFields()}
      `,
      )
      .then(ProjectModel.parse);
  }

  async enableProjectNameInGithubCheck(args: { organizationId?: string; projectId: string }) {
    return this.pg
      .maybeOne(
        psql`/* enableProjectNameInGithubCheck */
        UPDATE projects
        SET github_check_with_project_name = true
        WHERE id = ${args.projectId}
        RETURNING ${projectFields()}
      `,
      )
      .then(ProjectModel.parse);
  }

  async deleteProject(args: { organizationId: string; projectId: string }) {
    const result = await this.pg.transaction('deleteProject', async trx => {
      const tokens = await trx
        .any(
          psql`/* findProjectTokensForDeletion */
          SELECT token FROM tokens
          WHERE project_id = ${args.projectId} AND deleted_at IS NULL
        `,
        )
        .then(z.array(z.object({ token: z.string() })).parse);
      const project = await trx
        .maybeOne(
          psql`/* deleteProject */
          DELETE FROM projects
          WHERE id = ${args.projectId} AND org_id = ${args.organizationId}
          RETURNING ${projectFields()}
        `,
        )
        .then(ProjectModel.parse);

      return { project, tokens: tokens.map(row => row.token) };
    });

    return { ...result.project, tokens: result.tokens };
  }
}

const projectFields = (prefix: TaggedTemplateLiteralInvocation = psql``) => psql`
  ${prefix}id,
  ${prefix}clean_id AS slug,
  ${prefix}name,
  ${prefix}org_id AS "orgId",
  ${prefix}type,
  to_json(${prefix}created_at) AS "createdAt",
  ${prefix}build_url AS "buildUrl",
  ${prefix}validation_url AS "validationUrl",
  ${prefix}git_repository AS "gitRepository",
  ${prefix}github_check_with_project_name AS "useProjectNameInGithubCheck",
  ${prefix}external_composition_enabled AS "externalCompositionEnabled",
  ${prefix}external_composition_endpoint AS "externalCompositionEndpoint",
  ${prefix}external_composition_secret AS "externalCompositionEncryptedSecret",
  ${prefix}native_federation AS "nativeFederation"
`;

const ProjectModel = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    orgId: z.string(),
    type: z.string(),
    createdAt: z.string(),
    buildUrl: z.string().nullable(),
    validationUrl: z.string().nullable(),
    gitRepository: z.string().nullable(),
    useProjectNameInGithubCheck: z.boolean(),
    externalCompositionEnabled: z.boolean(),
    externalCompositionEndpoint: z.string().nullable(),
    externalCompositionEncryptedSecret: z.string().nullable(),
    nativeFederation: z.boolean().nullable(),
  })
  .transform(project => ({
    id: project.id,
    slug: project.slug,
    orgId: project.orgId,
    name: project.name,
    type: project.type as ProjectType,
    createdAt: project.createdAt,
    buildUrl: project.buildUrl,
    validationUrl: project.validationUrl,
    gitRepository: project.gitRepository as `${string}/${string}` | null,
    useProjectNameInGithubCheck: project.useProjectNameInGithubCheck === true,
    externalComposition: {
      enabled: project.externalCompositionEnabled,
      endpoint: project.externalCompositionEndpoint,
      encryptedSecret: project.externalCompositionEncryptedSecret,
    },
    nativeFederation: project.nativeFederation === true,
  }));
