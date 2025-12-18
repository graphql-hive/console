import { Inject, Injectable, Scope } from 'graphql-modules';
import { sql, type CommonQueryMethods, type DatabasePool } from 'slonik';
import { z } from 'zod';
import {
  decodeCreatedAtAndUUIDIdBasedCursor,
  encodeCreatedAtAndUUIDIdBasedCursor,
} from '@hive/storage';
import * as GraphQLSchema from '../../../__generated__/types';
import { Organization, Project } from '../../../shared/entities';
import { isUUID } from '../../../shared/is-uuid';
import { APP_DEPLOYMENTS_ENABLED } from '../../app-deployments/providers/app-deployments-enabled-token';
import { AuditLogRecorder } from '../../audit-logs/providers/audit-log-recorder';
import {
  getPermissionGroup,
  InsufficientPermissionError,
  Permission,
  PermissionsModel,
  permissionsToPermissionsPerResourceLevelAssignment,
  ResourceLevel,
  Session,
} from '../../auth/lib/authz';
import {
  resourceLevelToHumanReadableName,
  resourceLevelToResourceLevelType,
} from '../../auth/resolvers/Permission';
import { OTEL_TRACING_ENABLED } from '../../operations/providers/traces';
import { SCHEMA_PROPOSALS_ENABLED } from '../../proposals/providers/schema-proposals-enabled-token';
import { IdTranslator } from '../../shared/providers/id-translator';
import { Logger } from '../../shared/providers/logger';
import { PG_POOL_CONFIG } from '../../shared/providers/pg-pool';
import { Storage } from '../../shared/providers/storage';
import * as OrganizationAccessKey from '../lib/organization-access-key';
import * as OrganizationAccessTokensPermissions from '../lib/organization-access-token-permissions';
import * as OrganizationMemberPermissions from '../lib/organization-member-permissions';
import { PermissionGroup, PermissionRecord } from '../lib/permissions';
import {
  intersectResourceAssignments,
  ResourceAssignmentGroup,
  ResourceAssignmentModel,
} from '../lib/resource-assignment-model';
import { OrganizationAccessTokensCache } from './organization-access-tokens-cache';
import { OrganizationMembers, OrganizationMembership } from './organization-members';
import {
  resolveResourceAssignment,
  ResourceAssignments,
  translateResolvedResourcesToAuthorizationPolicyStatements,
} from './resource-assignments';

const TitleInputModel = z
  .string()
  .trim()
  .regex(/^[ a-zA-Z0-9_-]+$/, 'Can only contain letters, numbers, " ", "_", and "-".')
  .min(2, 'Minimum length is 2 characters.')
  .max(100, 'Maximum length is 100 characters.');

const DescriptionInputModel = z
  .string()
  .trim()
  .max(248, 'Maximum length is 248 characters.')
  .nullable();

const OrganizationAccessTokenModel = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    projectId: z.string().uuid().nullable(),
    userId: z.string().uuid().nullable(),
    createdAt: z.string(),
    title: z.string(),
    description: z.string(),
    /** Note: permissions is only supposed to be nullable if "userId" is non-null */
    permissions: z.array(PermissionsModel).nullable(),
    assignedResources: ResourceAssignmentModel.nullable().transform(
      value => value ?? { mode: '*' as const, projects: [] },
    ),
    firstCharacters: z.string(),
    hash: z.string(),
  })
  .transform(record => ({
    ...record,
    get __typename() {
      return record.userId
        ? ('PersonalAccessToken' as const)
        : record.projectId
          ? ('ProjectAccessToken' as const)
          : ('OrganizationAccessToken' as const);
    },
    scope: record.userId
      ? ('PERSONAL' as const)
      : record.projectId
        ? ('PROJECT' as const)
        : ('ORGANIZATION' as const),
    // We have these as a getter statement as they are
    // only used in the context of authorization, we do not need
    // to compute when querying a list of organization access tokens via the GraphQL API.
    get authorizationPolicyStatements() {
      if (record.permissions === null && record.userId === null) {
        throw new Error(
          'I am very sorry, but this property only works for access tokens on the organization and project scope.' +
            '\nFor user access tokens we need to look at the organization memebrship in order to compute the authorization policy statements.',
        );
      }
      const permissions = permissionsToPermissionsPerResourceLevelAssignment(
        record.permissions ?? [],
      );
      let assignedResources = record.assignedResources;

      // Filter down permissions based on project - just to be sure :)
      if (record.projectId) {
        assignedResources = {
          mode: 'granular',
          projects:
            assignedResources.mode === 'granular'
              ? assignedResources.projects.filter(project => project.id === record.projectId)
              : [],
        };
      }

      const resolvedResources = resolveResourceAssignment({
        organizationId: record.organizationId,
        projects: assignedResources,
      });

      return translateResolvedResourcesToAuthorizationPolicyStatements(
        record.organizationId,
        permissions,
        resolvedResources,
      );
    },
  }));

export type OrganizationAccessToken = z.TypeOf<typeof OrganizationAccessTokenModel>;

const validProjectResourceLevels: ReadonlySet<string> = new Set<string>([
  'project',
  'target',
  'service',
  'appDeployment',
]);

@Injectable({
  scope: Scope.Operation,
})
export class OrganizationAccessTokens {
  logger: Logger;

  private findById: ReturnType<typeof findById>;

  constructor(
    @Inject(PG_POOL_CONFIG) private pool: DatabasePool,
    private cache: OrganizationAccessTokensCache,
    private resourceAssignments: ResourceAssignments,
    private idTranslator: IdTranslator,
    private session: Session,
    private auditLogs: AuditLogRecorder,
    private storage: Storage,
    private members: OrganizationMembers,
    logger: Logger,
    @Inject(OTEL_TRACING_ENABLED) private otelTracingEnabled: boolean,
    @Inject(APP_DEPLOYMENTS_ENABLED) private appDeploymentsEnabled: boolean,
    @Inject(SCHEMA_PROPOSALS_ENABLED) private schemaProposalsEnabled: boolean,
  ) {
    this.logger = logger.child({
      source: 'OrganizationAccessTokens',
    });
    this.findById = findById({ logger: this.logger, pool });
  }

  private _validateCreateInputError(args: { title: string; description: string | null }) {
    const titleResult = TitleInputModel.safeParse(args.title.trim());
    const descriptionResult = DescriptionInputModel.safeParse(args.description);

    if (titleResult.error || descriptionResult.error) {
      return {
        type: 'error' as const,
        message: 'Invalid input provided.',
        details: {
          title: titleResult.error?.issues.at(0)?.message ?? null,
          description: descriptionResult.error?.issues.at(0)?.message ?? null,
        },
      };
    }
  }

  /**
   * Create an access token that is on the project level.
   */
  async createForProject(args: {
    project: GraphQLSchema.ProjectReferenceInput;
    title: string;
    description: string | null;
    permissions: Array<string>;
    assignedResources: GraphQLSchema.ProjectTargetsResourceAssignmentInput | null;
  }) {
    this.logger.debug('create access token for project (project=%o)', args.project);

    const error = this._validateCreateInputError(args);

    if (error) {
      return error;
    }

    const selector = await this.idTranslator.resolveProjectReference({
      reference: args.project,
    });

    if (!selector) {
      this.session.raise('projectAccessToken:modify');
    }

    const { projectId, organizationId } = selector;

    await this.session.assertPerformAction({
      organizationId,
      params: { organizationId, projectId },
      action: 'projectAccessToken:modify',
    });

    const permissions = args.permissions.filter(permission =>
      validProjectResourceLevels.has(getPermissionGroup(permission as Permission)),
    );

    const assignedResources =
      await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
        organizationId,
        {
          mode: 'GRANULAR',
          projects: [
            {
              projectId,
              targets: args.assignedResources ?? { mode: 'ALL' },
            },
          ],
        },
      );

    return this._create({
      organizationId,
      projectId,
      title: args.title,
      description: args.description,
      assignedResources,
      permissions,
    });
  }

  /**
   * Create an access token that is on the organization level.
   */
  async createForOrganization(args: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    title: string;
    description: string | null;
    permissions: Array<string>;
    assignedResources: GraphQLSchema.ResourceAssignmentInput;
  }) {
    const error = this._validateCreateInputError(args);

    if (error) {
      return error;
    }

    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: args.organization,
      onError() {
        throw new InsufficientPermissionError('accessToken:modify');
      },
    });

    const organization = await this.storage.getOrganization({ organizationId });

    const assignedResources =
      await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
        organizationId,
        args.assignedResources ?? { mode: 'GRANULAR' },
      );

    await this.session.assertPerformAction({
      organizationId,
      params: { organizationId },
      action: 'accessToken:modify',
    });

    // Permissions assigned to this access token must be valid organization access token permissions
    const assignablePermissionFilter = (permission: Permission) =>
      OrganizationAccessTokensPermissions.assignablePermissions.has(permission);

    // Permissions assigned to this access token must be valid based on the organziations feature flags
    const featurePermissionFlagFilter = this.createFeatureFlagPermissionFilter(organization);

    const permissionFilter = (permission: Permission) =>
      featurePermissionFlagFilter(permission) && assignablePermissionFilter(permission);

    const permissions = Array.from(
      new Set(args.permissions.filter(permission => permissionFilter(permission as Permission))),
    );

    return this._create({
      organizationId,
      title: args.title,
      description: args.description,
      assignedResources,
      permissions,
    });
  }

  /** Create an access token on the user scope. */
  async createPersonalAccessTokenForViewer(args: {
    organization: GraphQLSchema.OrganizationReferenceInput;
    title: string;
    description: string | null;
    permissions: ReadonlyArray<string> | null;
    assignedResources: GraphQLSchema.ResourceAssignmentInput | null;
  }) {
    const error = this._validateCreateInputError(args);

    if (error) {
      return error;
    }

    const viewer = await this.session.getViewer();

    const { organizationId } = await this.idTranslator.resolveOrganizationReference({
      reference: args.organization,
      onError() {
        throw new InsufficientPermissionError('personalAccessToken:modify');
      },
    });

    const organization = await this.storage.getOrganization({ organizationId });

    await this.session.assertPerformAction({
      organizationId,
      params: { organizationId },
      action: 'personalAccessToken:modify',
    });

    const membership = await this.members.findOrganizationMembership({
      organization,
      userId: viewer.id,
    });

    if (!membership) {
      this.session.raise('personalAccessToken:modify');
    }

    // Handle permission assignment
    //
    // Must be intersection with the members permissions

    const assignedResources = intersectResourceAssignments(
      await this.resourceAssignments.transformGraphQLResourceAssignmentInputToResourceAssignmentGroup(
        organizationId,
        args.assignedResources ?? { mode: 'ALL' },
      ),
      membership.assignedRole.resources,
    );

    // Handle permission assignment
    //
    // permissions -> null : The access tokens permissions equal members permission.
    // permissions  -> non-null: The access tokens permissions equal a subset of the members permissions.

    let permissions = args.permissions;

    if (permissions !== null) {
      const membershipPermissions = membership.assignedRole.role.allPermissions;

      const membershipHasPermissionFilter = (permission: Permission) =>
        membershipPermissions.has(permission);

      // Permissions assigned to this access token must be valid organization access token permissions
      const assignablePermissionFilter = (permission: Permission) =>
        OrganizationAccessTokensPermissions.assignablePermissions.has(permission);

      // Permissions assigned to this access token must be valid based on the organziations feature flags
      const featurePermissionFlagFilter = this.createFeatureFlagPermissionFilter(organization);

      const permissionFilter = (permission: Permission) =>
        featurePermissionFlagFilter(permission) &&
        assignablePermissionFilter(permission) &&
        membershipHasPermissionFilter(permission);

      permissions = Array.from(
        new Set(permissions.filter(permission => permissionFilter(permission as Permission))),
      );
    }

    return this._create({
      organizationId,
      userId: viewer.id,
      title: args.title,
      description: args.description,
      assignedResources,
      permissions,
    });
  }

  private async _create(
    args: {
      title: string;
      description: string | null;
      assignedResources: ResourceAssignmentGroup;
    } & (
      | {
          // Organization Scope
          organizationId: string;
          userId?: never;
          projectId?: never;
          permissions: ReadonlyArray<string>;
        }
      | {
          // Project Scope
          organizationId: string;
          projectId: string;
          userId?: never;
          permissions: ReadonlyArray<string>;
        }
      | {
          // Personal Scope
          organizationId: string;
          userId: string;
          projectId?: never;
          permissions: ReadonlyArray<string> | null;
        }
    ),
  ) {
    const id = crypto.randomUUID();
    const accessKey = await OrganizationAccessKey.create(
      id,
      args.userId
        ? OrganizationAccessKey.AccessTokenCategory.personal
        : args.projectId
          ? OrganizationAccessKey.AccessTokenCategory.project
          : OrganizationAccessKey.AccessTokenCategory.organization,
    );

    const result = await this.pool.maybeOne<unknown>(sql`
      INSERT INTO "organization_access_tokens" (
        "id"
        , "organization_id"
        , "project_id"
        , "user_id"
        , "title"
        , "description"
        , "permissions"
        , "assigned_resources"
        , "hash"
        , "first_characters"
      )
      VALUES (
        ${id}
        , ${args.organizationId}
        , ${args.projectId ?? null}
        , ${args.userId ?? null}
        , ${args.title}
        , ${args.description}
        , ${args.permissions !== null ? sql.array(args.permissions, 'text') : null}
        , ${sql.jsonb(args.assignedResources)}
        , ${accessKey.hash}
        , ${accessKey.firstCharacters}
      )
      RETURNING
        ${organizationAccessTokenFields}
    `);

    const accessToken = OrganizationAccessTokenModel.parse(result);

    await this.cache.add(this.logger, accessToken);

    await this.auditLogs.record({
      organizationId: args.organizationId,
      eventType: 'ORGANIZATION_ACCESS_TOKEN_CREATED',
      metadata: {
        organizationAccessTokenId: accessToken.id,
        permissions: accessToken.permissions,
        assignedResources: accessToken.assignedResources,
        projectId: accessToken.projectId,
        userId: accessToken.userId,
      },
    });

    this.logger.debug('Access tokens was created successfully. (accessTokenId=%s)', accessToken.id);

    return {
      type: 'success' as const,
      accessToken,
      privateAccessKey: accessKey.privateAccessToken,
    };
  }

  async delete(args: { accessTokenId: string; onlyOrganizationScoped?: true }) {
    this.logger.debug('Delete access token. (accessTokenId=%s)', args.accessTokenId);

    const record = await this.findById(args.accessTokenId);
    if (record === null || (args.onlyOrganizationScoped && (record.projectId || record.userId))) {
      this.logger.debug('Delete failed. Token not found. (accessTokenId=%s)', args.accessTokenId);

      return {
        type: 'error' as const,
        message: 'The access token does not exist.',
      };
    }

    const canOrganizationAccessTokens = await this.session.canPerformAction({
      action: 'accessToken:modify',
      organizationId: record.organizationId,
      params: { organizationId: record.organizationId },
    });

    if (record.projectId) {
      if (!canOrganizationAccessTokens) {
        await this.session.assertPerformAction({
          action: 'projectAccessToken:modify',
          organizationId: record.organizationId,
          params: { organizationId: record.organizationId, projectId: record.projectId },
        });
      }
    } else if (record.userId) {
      if (!canOrganizationAccessTokens) {
        await this.session.assertPerformAction({
          action: 'personalAccessToken:modify',
          organizationId: record.organizationId,
          params: { organizationId: record.organizationId },
        });

        const viewer = await this.session.getViewer();
        if (viewer.id !== record.userId) {
          this.session.raise('personalAccessToken:modify');
        }
      }
    } else {
      if (!canOrganizationAccessTokens) {
        this.session.raise('accessToken:modify');
      }
    }

    await this.pool.query(sql`
      DELETE
      FROM
        "organization_access_tokens"
      WHERE
        "id" = ${record.id}
    `);

    await this.cache.purge(record);

    await this.auditLogs.record({
      organizationId: record.organizationId,
      eventType: 'ORGANIZATION_ACCESS_TOKEN_DELETED',
      metadata: {
        organizationAccessTokenId: record.id,
      },
    });

    this.logger.debug(
      'Access tokens was deleted successfully. (accessTokenId=%s)',
      args.accessTokenId,
    );

    return {
      type: 'success' as const,
      organizationAccessTokenId: record.id,
    };
  }

  async getPaginatedForOrganization(
    organization: Organization,
    args: {
      first: number | null;
      after: string | null;
      /** Whether only access tokens on the organization scope should be included in the result. */
      includeOnlyOrganizationScoped?: true;
    },
  ) {
    await this.session.assertPerformAction({
      organizationId: organization.id,
      params: { organizationId: organization.id },
      action: 'accessToken:modify',
    });

    let cursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    if (args.after) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }

    const result = await this.pool.any<unknown>(sql` /* OrganizationAccessTokens.getPaginated */
      SELECT
        ${organizationAccessTokenFields}
      FROM
        "organization_access_tokens"
      WHERE
        "organization_id" = ${organization.id}
        ${
          cursor
            ? sql`
              AND (
                (
                  "created_at" = ${cursor.createdAt}
                  AND "id" < ${cursor.id}
                )
                OR "created_at" < ${cursor.createdAt}
              )
            `
            : sql``
        }
        ${
          args.includeOnlyOrganizationScoped
            ? sql`
                AND "project_id" IS NULL
                AND "user_id" IS NULL
              `
            : sql``
        }
      ORDER BY
        "organization_id" ASC
        , "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `);

    let edges = result.map(row => {
      const node = OrganizationAccessTokenModel.parse(row);

      return {
        node,
        get cursor() {
          return encodeCreatedAtAndUUIDIdBasedCursor(node);
        },
      };
    });

    const hasNextPage = edges.length > limit;

    edges = edges.slice(0, limit);

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        get endCursor() {
          return edges[edges.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return edges[0]?.cursor ?? '';
        },
      },
    };
  }

  async getPaginatedForProject(
    project: Project,
    args: {
      first: number | null;
      after: string | null;
    },
  ) {
    await this.session.assertPerformAction({
      organizationId: project.orgId,
      params: { organizationId: project.orgId, projectId: project.id },
      action: 'projectAccessToken:modify',
    });

    let cursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    if (args.after) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }

    const result = await this.pool.any<unknown>(sql` /* OrganizationAccessTokens.getPaginated */
      SELECT
        ${organizationAccessTokenFields}
      FROM
        "organization_access_tokens"
      WHERE
        "project_id" = ${project.id}
        ${
          cursor
            ? sql`
              AND (
                (
                  "created_at" = ${cursor.createdAt}
                  AND "id" < ${cursor.id}
                )
                OR "created_at" < ${cursor.createdAt}
              )
            `
            : sql``
        }
      ORDER BY
        "project_id" ASC
        , "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `);

    let edges = result.map(row => {
      const node = OrganizationAccessTokenModel.parse(row);

      return {
        node,
        get cursor() {
          return encodeCreatedAtAndUUIDIdBasedCursor(node);
        },
      };
    });

    const hasNextPage = edges.length > limit;

    edges = edges.slice(0, limit);

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        get endCursor() {
          return edges[edges.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return edges[0]?.cursor ?? '';
        },
      },
    };
  }

  async getPaginatedForMembership(
    member: OrganizationMembership,
    args: {
      first: number | null;
      after: string | null;
    },
  ) {
    let cursor: null | {
      createdAt: string;
      id: string;
    } = null;

    const limit = args.first ? (args.first > 0 ? Math.min(args.first, 20) : 20) : 20;

    if (args.after) {
      cursor = decodeCreatedAtAndUUIDIdBasedCursor(args.after);
    }

    const result = await this.pool
      .any<unknown>(sql` /* OrganizationAccessTokens.getPaginatedForMembership */
      SELECT
        ${organizationAccessTokenFields}
      FROM
        "organization_access_tokens"
      WHERE
        "user_id" = ${member.userId}
        ${
          cursor
            ? sql`
              AND (
                (
                  "created_at" = ${cursor.createdAt}
                  AND "id" < ${cursor.id}
                )
                OR "created_at" < ${cursor.createdAt}
              )
            `
            : sql``
        }
      ORDER BY
        "user_id" ASC
        , "created_at" DESC
        , "id" DESC
      LIMIT ${limit + 1}
    `);

    let edges = result.map(row => {
      const node = OrganizationAccessTokenModel.parse(row);

      return {
        node,
        get cursor() {
          return encodeCreatedAtAndUUIDIdBasedCursor(node);
        },
      };
    });

    const hasNextPage = edges.length > limit;

    edges = edges.slice(0, limit);

    return {
      edges,
      pageInfo: {
        hasNextPage,
        hasPreviousPage: cursor !== null,
        get endCursor() {
          return edges[edges.length - 1]?.cursor ?? '';
        },
        get startCursor() {
          return edges[0]?.cursor ?? '';
        },
      },
    };
  }

  /** Get an access token by it's ID without performing any permission checks. */
  async getById(id: string) {
    return await findById({
      logger: this.logger,
      pool: this.pool,
    })(id);
  }

  async getForOrganization(
    organization: Organization,
    id: string,
    includeOnlyOrganizationScoped?: true,
  ) {
    await this.session.assertPerformAction({
      organizationId: organization.id,
      params: { organizationId: organization.id },
      action: 'accessToken:modify',
    });

    const accessToken = await this.getById(id);

    if (!accessToken || accessToken?.organizationId !== organization.id) {
      return null;
    }

    if (includeOnlyOrganizationScoped && (accessToken.projectId || accessToken.userId)) {
      return null;
    }

    return accessToken;
  }

  async getForMembership(membership: OrganizationMembership, id: string) {
    const accessToken = await this.getById(id);

    if (
      !accessToken ||
      !accessToken.userId ||
      accessToken.userId !== membership.userId ||
      accessToken.organizationId !== membership.organizationId
    ) {
      return null;
    }

    return accessToken;
  }

  async getForProject(project: Project, id: string) {
    await this.session.assertPerformAction({
      organizationId: project.orgId,
      params: { organizationId: project.orgId, projectId: project.id },
      action: 'projectAccessToken:modify',
    });

    const accessToken = await this.getById(id);

    if (!accessToken || accessToken?.projectId !== project.id) {
      return null;
    }

    return accessToken;
  }

  async getAvailablePermissionsGroupsForProject(project: Project): Promise<Array<PermissionGroup>> {
    await this.session.assertPerformAction({
      organizationId: project.orgId,
      params: { organizationId: project.orgId, projectId: project.id },
      action: 'projectAccessToken:modify',
    });

    const organization = await this.storage.getOrganization({ organizationId: project.orgId });
    const groups = await this.getAvailablePermissionGroupsForOrganization(organization);

    return groups
      .map(group => ({
        ...group,
        permissions: group.permissions.filter(permission =>
          validProjectResourceLevels.has(getPermissionGroup(permission.id)),
        ),
      }))
      .filter(group => group.permissions.length !== 0);
  }

  private createFeatureFlagPermissionFilter(organization: Organization) {
    const isAppDeploymentsEnabled =
      organization.featureFlags.appDeployments || this.appDeploymentsEnabled;
    const isOTELTracingEnabled = organization.featureFlags.otelTracing || this.otelTracingEnabled;
    const isSchemaProposalsEnabled =
      organization.featureFlags.schemaProposals || this.schemaProposalsEnabled;

    return (id: Permission) =>
      (!isAppDeploymentsEnabled && id.startsWith('appDeployment:')) ||
      (!isOTELTracingEnabled && id.startsWith('traces:')) ||
      (!isSchemaProposalsEnabled && id.startsWith('schemaProposal:'))
        ? false
        : true;
  }

  async getAvailablePermissionGroupsForOrganization(
    organization: Organization,
  ): Promise<Array<PermissionGroup>> {
    const filter = this.createFeatureFlagPermissionFilter(organization);

    return OrganizationAccessTokensPermissions.permissionGroups
      .map(group => ({
        ...group,
        permissions: group.permissions
          .filter(permission => filter(permission.id))
          .map(permission => ({
            ...permission,
            isAssignableByViewer: true,
          })),
      }))
      .filter(group => group.permissions.length !== 0);
  }

  async getAvailableMemberPermissionGroups(
    organization: Organization,
  ): Promise<Array<PermissionGroup>> {
    const filter = this.createFeatureFlagPermissionFilter(organization);

    return OrganizationMemberPermissions.permissionGroups
      .map(group => ({
        ...group,
        permissions: group.permissions
          .filter(permission => filter(permission.id))
          .map(permission => ({
            ...permission,
            isAssignableByViewer: true,
          })),
      }))
      .filter(group => group.permissions.length !== 0);
  }

  async getAvailablePermissionGroupsForMembership(membership: OrganizationMembership) {
    const organization = await this.storage.getOrganization({
      organizationId: membership.organizationId,
    });
    const groups = await this.getAvailablePermissionGroupsForOrganization(organization);
    const memberPermissions = membership.assignedRole.role.allPermissions;

    return groups
      .map(group => ({
        ...group,
        permissions: group.permissions.map(permission => ({
          ...permission,
          isAssignableByViewer: memberPermissions.has(permission.id),
        })),
      }))
      .filter(group => group.permissions.length !== 0);
  }

  async getPermissionsForAccessToken(accessToken: OrganizationAccessToken) {
    if (!accessToken.userId) {
      return accessToken.permissions ?? [];
    }
    const organization = await this.storage.getOrganization({
      organizationId: accessToken.organizationId,
    });
    const membership = await this.members.findOrganizationMembership({
      organization,
      userId: accessToken.userId,
    });
    if (!membership) {
      return [];
    }

    const allRolePermissions = membership.assignedRole.role.allPermissions;

    if (!accessToken.permissions) {
      return Array.from(membership.assignedRole.role.allPermissions);
    }

    return accessToken.permissions.filter(permission => allRolePermissions.has(permission));
  }

  async getResourceAssignmentsForAccessToken(accessToken: OrganizationAccessToken) {
    if (accessToken.userId === null) {
      return this.resourceAssignments.resolveGraphQLMemberResourceAssignment({
        organizationId: accessToken.organizationId,
        resources: accessToken.assignedResources,
      });
    }

    const organization = await this.storage.getOrganization({
      organizationId: accessToken.organizationId,
    });
    const membership = await this.members.findOrganizationMembership({
      organization,
      userId: accessToken.userId,
    });

    if (!membership) {
      return {
        mode: 'GRANULAR',
      } satisfies GraphQLSchema.ResolversTypes['ResourceAssignment'];
    }

    return this.resourceAssignments.resolveGraphQLMemberResourceAssignment({
      organizationId: accessToken.organizationId,
      resources: intersectResourceAssignments(
        accessToken.assignedResources,
        membership?.assignedRole.resources,
      ),
    });
  }

  getGraphQLResolvedResourcePermissionGroupForAccessToken =
    (
      accessToken: Pick<
        OrganizationAccessToken,
        'organizationId' | 'projectId' | 'assignedResources' | 'permissions' | 'userId'
      >,
    ) =>
    async (
      /** Whether to include all or only the granted permissions. */
      includeAll: boolean = false,
    ): Promise<Array<GraphQLResolvedResourcePermissionGroupOutput>> => {
      let grantedPermissions: Set<Permission>;
      let grantedResources: ResourceAssignmentGroup;

      if (accessToken.userId) {
        const organization = await this.storage.getOrganization({
          organizationId: accessToken.organizationId,
        });
        const membership = await this.members.findOrganizationMembership({
          organization,
          userId: accessToken.userId,
        });

        if (
          !membership ||
          !membership.assignedRole.role.permissions.organization.has('personalAccessToken:modify')
        ) {
          return [];
        }

        grantedResources = intersectResourceAssignments(
          accessToken.assignedResources,
          membership.assignedRole.resources,
        );
        const membershipPermissions = membership.assignedRole.role.allPermissions;
        grantedPermissions = new Set(
          accessToken.permissions?.filter(permission => membershipPermissions.has(permission)) ??
            [],
        );
      } else {
        grantedPermissions = new Set(accessToken.permissions ?? []);
        grantedResources = accessToken.assignedResources;
      }

      const resourceIds = await this.resourceAssignments.resourceAssignmentToResourceIds(
        accessToken.organizationId,
        grantedResources,
      );

      type PMap = {
        level: ResourceLevel;
        permissionGroups: Map<
          /* group name */ string,
          {
            title: string;
            permissions: Array<{
              permission: PermissionRecord;
              isGranted: boolean;
            }>;
          }
        >;
        resourceIds: Array<string>;
      };

      const resourceLevelGroups = new Map<ResourceLevel, PMap>(
        (
          [
            'organization',
            'project',
            'target',
            'service',
            'appDeployment',
          ] satisfies Array<ResourceLevel>
        ).map((value): [ResourceLevel, PMap] => [
          value,
          {
            level: value,
            permissionGroups: new Map(),
            resourceIds: resourceIds[value] ?? [],
          },
        ]),
      );

      if (accessToken.projectId) {
        resourceLevelGroups.delete('organization');
      }

      for (const pgroup of OrganizationAccessTokensPermissions.permissionGroups) {
        for (const permission of pgroup.permissions) {
          const resourceLevel = getPermissionGroup(permission.id);
          const resourceGroup = resourceLevelGroups.get(resourceLevel);

          if (resourceGroup === undefined) {
            continue;
          }

          let group = resourceGroup.permissionGroups.get(pgroup.title);

          if (group === undefined) {
            group = {
              title: pgroup.title,
              permissions: [],
            };
            resourceGroup.permissionGroups.set(pgroup.title, group);
          }

          const isGranted = grantedPermissions.has(permission.id);

          if (includeAll || isGranted) {
            group.permissions.push({
              isGranted: grantedPermissions.has(permission.id),
              permission,
            });
          }
        }
      }

      return Array.from(resourceLevelGroups.values())
        .map(
          resourceGroup =>
            ({
              level: resourceLevelToResourceLevelType(resourceGroup.level),
              title: resourceLevelToHumanReadableName(resourceGroup.level),
              resolvedPermissionGroups: Array.from(resourceGroup.permissionGroups.values())
                .map(group => ({
                  title: group.title,
                  permissions: group.permissions.map(permission => ({
                    isGranted: permission.isGranted,
                    permission: permission.permission,
                  })),
                }))
                .filter(group => (includeAll ? true : group.permissions.length !== 0)),
              resolvedResourceIds: resourceGroup.resourceIds.length
                ? resourceGroup.resourceIds
                : null,
            }) satisfies GraphQLResolvedResourcePermissionGroupOutput,
        )
        .filter(group =>
          includeAll
            ? true
            : group.resolvedPermissionGroups.length !== 0 && group.resolvedResourceIds?.length,
        );
    };

  static computeAuthorizationStatements(
    accessToken: OrganizationAccessToken,
    membership: OrganizationMembership,
  ) {
    let permissions = accessToken.permissions;
    const allMembershipPermissions = membership.assignedRole.role.allPermissions;

    // if the user does not have this, the user cannot have personal access tokens.
    if (!allMembershipPermissions.has('personalAccessToken:modify')) {
      return [];
    }

    if (permissions === null) {
      permissions = Array.from(membership.assignedRole.role.allPermissions);
    } else {
      const allMembershipPermissions = membership.assignedRole.role.allPermissions;
      permissions = permissions.filter(permission => allMembershipPermissions.has(permission));
    }

    let resources = accessToken.assignedResources;

    if (resources === null) {
      resources = membership.assignedRole.resources;
    } else {
      const membershipResources = membership.assignedRole.resources;
      resources = intersectResourceAssignments(membershipResources, resources);
    }

    const permissionsPerLevel = permissionsToPermissionsPerResourceLevelAssignment(permissions);
    const resolvedResources = resolveResourceAssignment({
      organizationId: accessToken.organizationId,
      projects: resources,
    });

    return translateResolvedResourcesToAuthorizationPolicyStatements(
      accessToken.organizationId,
      permissionsPerLevel,
      resolvedResources,
    );
  }
}

type ResolveType<TResolverType> =
  TResolverType extends GraphQLSchema.ResolverTypeWrapper<infer T> ? T : never;

export type GraphQLResolvedResourcePermissionGroupOutput = ResolveType<
  GraphQLSchema.ResolversTypes['ResolvedResourcePermissionGroup']
>;

/**
 * Implementation for finding a organization access token from the PG database.
 * It is a function, so we can use it for the organization access tokens cache.
 */
export function findById(deps: { pool: CommonQueryMethods; logger: Logger }) {
  return async function findByIdImplementation(organizationAccessTokenId: string) {
    deps.logger.debug(
      'Resolve organization access token by id. (organizationAccessTokenId=%s)',
      organizationAccessTokenId,
    );

    if (isUUID(organizationAccessTokenId) === false) {
      deps.logger.debug(
        'Invalid UUID provided. (organizationAccessTokenId=%s)',
        organizationAccessTokenId,
      );
      return null;
    }

    const data = await deps.pool.maybeOne<unknown>(sql` /* OrganizationAccessTokens.findById */
      SELECT
        ${organizationAccessTokenFields}
      FROM
        "organization_access_tokens"
      WHERE
        "id" = ${organizationAccessTokenId}
      LIMIT 1
    `);

    if (data === null) {
      deps.logger.debug(
        'Organization access token not found. (organizationAccessTokenId=%s)',
        organizationAccessTokenId,
      );
      return null;
    }

    const result = OrganizationAccessTokenModel.parse(data);

    deps.logger.debug(
      'Organization access token found. (organizationAccessTokenId=%s, scope=%s)',
      organizationAccessTokenId,
      result.scope,
    );

    return result;
  };
}

const organizationAccessTokenFields = sql`
  "id"
  , "organization_id" AS "organizationId"
  , "project_id" AS "projectId"
  , "user_id" AS "userId"
  , to_json("created_at") AS "createdAt"
  , "title"
  , "description"
  , "permissions"
  , "assigned_resources" AS "assignedResources"
  , "first_characters" AS "firstCharacters"
  , "hash"
`;
