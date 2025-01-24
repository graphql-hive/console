import { humanId } from 'human-id';
import { createPool, sql } from 'slonik';
import type { Report } from '../../packages/libraries/core/src/client/usage.js';
import { authenticate, userEmail } from './auth';
import {
  CreateCollectionMutation,
  CreateOperationMutation,
  DeleteCollectionMutation,
  DeleteOperationMutation,
  UpdateCollectionMutation,
  UpdateOperationMutation,
  UpdatePreflightScriptMutation,
} from './collections';
import { ensureEnv } from './env';
import {
  addAlert,
  addAlertChannel,
  assignMemberRole,
  checkSchema,
  compareToPreviousVersion,
  createCdnAccess,
  createMemberRole,
  createOrganization,
  createProject,
  createTarget,
  createToken,
  deleteMemberRole,
  deleteSchema,
  deleteTokens,
  fetchLatestSchema,
  fetchLatestValidSchema,
  fetchMetadataFromCDN,
  fetchSchemaFromCDN,
  fetchSupergraphFromCDN,
  fetchVersions,
  getOrganization,
  getOrganizationMembers,
  getOrganizationProjects,
  inviteToOrganization,
  joinOrganization,
  publishSchema,
  readClientStats,
  readOperationBody,
  readOperationsStats,
  readTokenInfo,
  setTargetValidation,
  updateBaseSchema,
  updateMemberRole,
  updateTargetValidationSettings,
} from './flow';
import * as GraphQLSchema from './gql/graphql';
import {
  BreakingChangeFormula,
  OrganizationAccessScope,
  ProjectAccessScope,
  ProjectType,
  SchemaPolicyInput,
  TargetAccessScope,
} from './gql/graphql';
import { execute } from './graphql';
import { UpdateSchemaPolicyForOrganization, UpdateSchemaPolicyForProject } from './schema-policy';
import { collect, CollectedOperation, legacyCollect } from './usage';
import { generateUnique } from './utils';

export function initSeed() {
  function createConnectionPool() {
    const pg = {
      user: ensureEnv('POSTGRES_USER'),
      password: ensureEnv('POSTGRES_PASSWORD'),
      host: ensureEnv('POSTGRES_HOST'),
      port: ensureEnv('POSTGRES_PORT'),
      db: ensureEnv('POSTGRES_DB'),
    };

    return createPool(
      `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.db}?sslmode=disable`,
    );
  }

  return {
    async createDbConnection() {
      const pool = await createConnectionPool();
      return {
        pool,
        [Symbol.asyncDispose]: async () => {
          await pool.end();
        },
      };
    },
    authenticate,
    generateEmail: () => userEmail(generateUnique()),
    async createOwner() {
      const ownerEmail = userEmail(generateUnique());
      const auth = await authenticate(ownerEmail);
      const ownerRefreshToken = auth.refresh_token;
      const ownerToken = auth.access_token;

      return {
        ownerEmail,
        ownerToken,
        ownerRefreshToken,
        async createOrg() {
          const orgSlug = generateUnique();
          const orgResult = await createOrganization({ slug: orgSlug }, ownerToken).then(r =>
            r.expectNoGraphQLErrors(),
          );

          const organization =
            orgResult.createOrganization.ok!.createdOrganizationPayload.organization;

          return {
            organization,
            async setFeatureFlag(name: string, value: boolean | string[]) {
              const pool = await createConnectionPool();

              await pool.query(sql`
                UPDATE organizations SET feature_flags = ${sql.jsonb({
                  [name]: value,
                })}
                WHERE id = ${organization.id}
              `);

              await pool.end();
            },
            async setDataRetention(days: number) {
              const pool = await createConnectionPool();

              await pool.query(sql`
                UPDATE organizations SET limit_retention_days = ${days} WHERE id = ${organization.id}
              `);

              await pool.end();
            },
            async setOrganizationSchemaPolicy(policy: SchemaPolicyInput, allowOverrides: boolean) {
              const result = await execute({
                document: UpdateSchemaPolicyForOrganization,
                variables: {
                  allowOverrides,
                  selector: {
                    organizationSlug: organization.slug,
                  },
                  policy,
                },
                authToken: ownerToken,
              }).then(r => r.expectNoGraphQLErrors());

              return result.updateSchemaPolicyForOrganization;
            },
            async fetchOrganizationInfo() {
              const result = await getOrganization(organization.slug, ownerToken).then(r =>
                r.expectNoGraphQLErrors(),
              );

              return result.organization!.organization;
            },
            async inviteMember(
              email = 'some@email.com',
              inviteToken = ownerToken,
              roleId?: string,
            ) {
              const inviteResult = await inviteToOrganization(
                {
                  email,
                  organizationSlug: organization.slug,
                  roleId,
                },
                inviteToken,
              ).then(r => r.expectNoGraphQLErrors());

              return inviteResult.inviteToOrganizationByEmail;
            },
            async joinMemberUsingCode(inviteCode: string, memberToken: string) {
              return await joinOrganization(inviteCode, memberToken);
            },
            async members() {
              const membersResult = await getOrganizationMembers(
                { organizationSlug: organization.slug },
                ownerToken,
              ).then(r => r.expectNoGraphQLErrors());

              const members = membersResult.organization?.organization.members?.nodes;

              if (!members) {
                throw new Error(`Could not get members for org ${organization.slug}`);
              }

              return members;
            },
            async projects(token = ownerToken) {
              const projectsResult = await getOrganizationProjects(
                { organizationSlug: organization.slug },
                token,
              ).then(r => r.expectNoGraphQLErrors());

              const projects = projectsResult.organization?.organization.projects.nodes;

              if (!projects) {
                throw new Error(`Could not get projects for org ${organization.slug}`);
              }

              return projects;
            },
            async createProject(projectType: ProjectType = ProjectType.Single) {
              const projectResult = await createProject(
                {
                  organizationSlug: organization.slug,
                  type: projectType,
                  slug: generateUnique(),
                },
                ownerToken,
              ).then(r => r.expectNoGraphQLErrors());

              const targets = projectResult.createProject.ok!.createdTargets;
              const target = targets[0];
              const project = projectResult.createProject.ok!.createdProject;

              return {
                project,
                targets,
                target,
                async setNativeFederation(enabled: boolean) {
                  const pool = await createConnectionPool();

                  await pool.query(sql`
                    UPDATE projects SET native_federation = ${enabled} WHERE id = ${project.id}
                  `);

                  await pool.end();
                },
                async setProjectSchemaPolicy(policy: SchemaPolicyInput) {
                  const result = await execute({
                    document: UpdateSchemaPolicyForProject,
                    variables: {
                      selector: {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                      },
                      policy,
                    },
                    authToken: ownerToken,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.updateSchemaPolicyForProject;
                },
                async removeTokens(tokenIds: string[]) {
                  return await deleteTokens(
                    {
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: target.slug,
                      tokenIds,
                    },
                    ownerToken,
                  )
                    .then(r => r.expectNoGraphQLErrors())
                    .then(r => r.deleteTokens.deletedTokens);
                },
                async createDocumentCollection({
                  name,
                  description,
                  token = ownerToken,
                }: {
                  name: string;
                  description: string;
                  token?: string;
                }) {
                  const result = await execute({
                    document: CreateCollectionMutation,
                    variables: {
                      input: {
                        name,
                        description,
                      },
                      selector: {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                        targetSlug: target.slug,
                      },
                    },
                    authToken: token,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.createDocumentCollection;
                },
                async updatePreflightScript({
                  sourceCode,
                  token = ownerToken,
                }: {
                  sourceCode: string;
                  token?: string;
                }) {
                  const result = await execute({
                    document: UpdatePreflightScriptMutation,
                    variables: {
                      input: {
                        selector: {
                          organizationSlug: organization.slug,
                          projectSlug: project.slug,
                          targetSlug: target.slug,
                        },
                        sourceCode,
                      },
                    },
                    authToken: token,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.updatePreflightScript;
                },
                async updateDocumentCollection({
                  collectionId,
                  name,
                  description,
                  token = ownerToken,
                }: {
                  collectionId: string;
                  name: string;
                  description: string;
                  token?: string;
                }) {
                  const result = await execute({
                    document: UpdateCollectionMutation,
                    variables: {
                      input: {
                        collectionId,
                        name,
                        description,
                      },
                      selector: {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                        targetSlug: target.slug,
                      },
                    },
                    authToken: token,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.updateDocumentCollection;
                },
                async deleteDocumentCollection({
                  collectionId,
                  token = ownerToken,
                }: {
                  collectionId: string;
                  token?: string;
                }) {
                  const result = await execute({
                    document: DeleteCollectionMutation,
                    variables: {
                      id: collectionId,
                      selector: {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                        targetSlug: target.slug,
                      },
                    },
                    authToken: token,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.deleteDocumentCollection;
                },
                async createOperationInCollection(input: {
                  collectionId: string;
                  name: string;
                  query: string;
                  variables?: string;
                  headers?: string;
                  token?: string;
                }) {
                  const result = await execute({
                    document: CreateOperationMutation,
                    variables: {
                      input: {
                        collectionId: input.collectionId,
                        name: input.name,
                        query: input.query,
                        headers: input.headers,
                        variables: input.variables,
                      },
                      selector: {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                        targetSlug: target.slug,
                      },
                    },
                    authToken: input.token || ownerToken,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.createOperationInDocumentCollection;
                },
                async deleteOperationInCollection(input: { operationId: string; token?: string }) {
                  const result = await execute({
                    document: DeleteOperationMutation,
                    variables: {
                      id: input.operationId,
                      selector: {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                        targetSlug: target.slug,
                      },
                    },
                    authToken: input.token || ownerToken,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.deleteOperationInDocumentCollection;
                },
                async updateOperationInCollection(input: {
                  operationId: string;
                  collectionId: string;
                  name: string;
                  query: string;
                  variables?: string;
                  headers?: string;
                  token?: string;
                }) {
                  const result = await execute({
                    document: UpdateOperationMutation,
                    variables: {
                      input: {
                        operationId: input.operationId,
                        collectionId: input.collectionId,
                        name: input.name,
                        query: input.query,
                        headers: input.headers,
                        variables: input.variables,
                      },
                      selector: {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                        targetSlug: target.slug,
                      },
                    },
                    authToken: input.token || ownerToken,
                  }).then(r => r.expectNoGraphQLErrors());

                  return result.updateOperationInDocumentCollection;
                },
                async addAlert(
                  input: {
                    token?: string;
                  } & Parameters<typeof addAlert>[0],
                ) {
                  const result = await addAlert(input, input.token || ownerToken).then(r =>
                    r.expectNoGraphQLErrors(),
                  );
                  return result.addAlert;
                },
                async addAlertChannel(
                  input: { token?: string } & Parameters<typeof addAlertChannel>[0],
                ) {
                  const result = await addAlertChannel(input, input.token || ownerToken).then(r =>
                    r.expectNoGraphQLErrors(),
                  );
                  return result.addAlertChannel;
                },
                /**
                 * Create a access token for a given target.
                 * This token can be used for usage reporting and all actions that would be performed by the CLI.
                 */
                async createTargetAccessToken({
                  mode = 'readWrite',
                  target: forTarget = {
                    slug: target.slug,
                    id: target.id,
                  },
                  actorToken = ownerToken,
                }: {
                  mode?: 'readWrite' | 'readOnly' | 'noAccess';
                  target?: {
                    slug: string;
                    id: string;
                  };
                  actorToken?: string;
                }) {
                  const target = forTarget;

                  const tokenResult = await createToken(
                    {
                      name: generateUnique(),
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: target.slug,
                      organizationScopes: [],
                      projectScopes: [],
                      targetScopes:
                        mode === 'noAccess'
                          ? []
                          : mode === 'readWrite'
                            ? [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite]
                            : [TargetAccessScope.RegistryRead],
                    },
                    actorToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  const secret = tokenResult.createToken.ok!.secret;
                  const token = tokenResult.createToken.ok!.createdToken;

                  return {
                    token,
                    secret,
                    async collectLegacyOperations(
                      operations: CollectedOperation[],
                      headerName: 'x-api-token' | 'authorization' = 'authorization',
                    ) {
                      return await legacyCollect({
                        operations,
                        token: secret,
                        authorizationHeader: headerName,
                      });
                    },
                    collectUsage(report: Report) {
                      return collect({
                        report,
                        accessToken: secret,
                      });
                    },
                    async checkSchema(
                      sdl: string,
                      service?: string,
                      meta?: {
                        author: string;
                        commit: string;
                      },
                      contextId?: string,
                    ) {
                      return await checkSchema(
                        {
                          sdl,
                          service,
                          meta,
                          contextId,
                        },
                        secret,
                      );
                    },
                    async publishSchema(options: {
                      sdl: string;
                      headerName?: 'x-api-token' | 'authorization';
                      author?: string;
                      force?: boolean;
                      experimental_acceptBreakingChanges?: boolean;
                      commit?: string;
                      service?: string;
                      url?: string;
                      metadata?: string;
                      /**
                       * @deprecated
                       */
                      github?: boolean | null;
                    }) {
                      return await publishSchema(
                        {
                          author: options.author || 'Kamil',
                          commit: options.commit || 'test',
                          sdl: options.sdl,
                          service: options.service,
                          url: options.url,
                          force: options.force,
                          metadata: options.metadata,
                          experimental_acceptBreakingChanges:
                            options.experimental_acceptBreakingChanges,
                          github: options.github,
                        },
                        secret,
                        options.headerName || 'authorization',
                      );
                    },
                    async deleteSchema(serviceName: string) {
                      return await deleteSchema(
                        {
                          serviceName,
                          dryRun: false,
                        },
                        secret,
                      );
                    },
                    async latestSchema() {
                      return (await fetchLatestSchema(secret)).expectNoGraphQLErrors();
                    },
                    async fetchLatestValidSchema() {
                      return (await fetchLatestValidSchema(secret)).expectNoGraphQLErrors();
                    },
                    async fetchTokenInfo() {
                      const tokenInfoResult = await readTokenInfo(secret).then(r =>
                        r.expectNoGraphQLErrors(),
                      );

                      return tokenInfoResult.tokenInfo;
                    },
                  };
                },
                async createCdnAccess(ttarget: TargetOverwrite = target) {
                  const result = await createCdnAccess(
                    {
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: ttarget.slug,
                    },
                    ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());
                  expect(result.createCdnAccessToken.ok).not.toBeNull();

                  const data = result.createCdnAccessToken.ok!;

                  return {
                    secretAccessToken: data.secretAccessToken,
                    cdnUrl: data.cdnUrl,
                    fetchSchemaFromCDN() {
                      return fetchSchemaFromCDN(data.cdnUrl, data.secretAccessToken);
                    },
                    fetchMetadataFromCDN() {
                      return fetchMetadataFromCDN(data.cdnUrl, data.secretAccessToken);
                    },
                    fetchSupergraphFromCDN() {
                      return fetchSupergraphFromCDN(data.cdnUrl, data.secretAccessToken);
                    },
                  };
                },
                async toggleTargetValidation(enabled: boolean, ttarget: TargetOverwrite = target) {
                  const result = await setTargetValidation(
                    {
                      enabled,
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: ttarget.slug,
                    },
                    {
                      token: ownerToken,
                    },
                  ).then(r => r.expectNoGraphQLErrors());

                  return result;
                },
                async updateTargetValidationSettings({
                  excludedClients,
                  percentage,
                  target: ttarget = target,
                  requestCount,
                  breakingChangeFormula,
                }: {
                  excludedClients?: string[];
                  percentage: number;
                  requestCount?: number;
                  breakingChangeFormula?: BreakingChangeFormula;
                  target?: TargetOverwrite;
                }) {
                  const result = await updateTargetValidationSettings(
                    {
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: ttarget.slug,
                      excludedClients,
                      percentage,
                      requestCount,
                      breakingChangeFormula,
                      period: 2,
                      targetIds: [target.id],
                    },
                    {
                      token: ownerToken,
                    },
                  ).then(r => r.expectNoGraphQLErrors());

                  return result.updateTargetValidationSettings;
                },
                async compareToPreviousVersion(version: string, ttarget: TargetOverwrite = target) {
                  return (
                    await compareToPreviousVersion(
                      {
                        organizationSlug: organization.slug,
                        projectSlug: project.slug,
                        targetSlug: ttarget.slug,
                        version,
                      },
                      ownerToken,
                    )
                  ).expectNoGraphQLErrors();
                },
                async readOperationBody(hash: string, ttarget: TargetOverwrite = target) {
                  const operationBodyResult = await readOperationBody(
                    {
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: ttarget.slug,
                      hash,
                    },
                    ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  return operationBodyResult?.target?.operation?.body;
                },
                async readOperationsStats(
                  from: string,
                  to: string,
                  ttarget: TargetOverwrite = target,
                ) {
                  const statsResult = await readOperationsStats(
                    {
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: ttarget.slug,
                      period: {
                        from,
                        to,
                      },
                    },
                    ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  return statsResult.operationsStats;
                },
                async readClientStats(params: { clientName: string; from: string; to: string }) {
                  const statsResult = await readClientStats(
                    {
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: target.slug,
                      client: params.clientName,
                      period: {
                        from: params.from,
                        to: params.to,
                      },
                    },
                    ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  return statsResult.clientStats;
                },
                async updateBaseSchema(newBase: string, ttarget: TargetOverwrite = target) {
                  const result = await updateBaseSchema(
                    {
                      newBase,
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: ttarget.slug,
                    },
                    ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  return result.updateBaseSchema;
                },
                async fetchVersions(count: number, ttarget: TargetOverwrite = target) {
                  const result = await fetchVersions(
                    {
                      organizationSlug: organization.slug,
                      projectSlug: project.slug,
                      targetSlug: ttarget.slug,
                    },
                    count,
                    ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  if (!result.target) {
                    throw new Error('Could not find target');
                  }

                  return result.target?.schemaVersions.edges.map(edge => edge.node);
                },
                async createTarget(args?: { slug?: string; accessToken?: string }) {
                  return createTarget(
                    {
                      organizationSlug: orgSlug,
                      projectSlug: project.slug,
                      slug: args?.slug ?? generateUnique(),
                    },
                    args?.accessToken ?? ownerToken,
                  );
                },
              };
            },
            async inviteAndJoinMember(inviteToken: string = ownerToken) {
              const memberEmail = userEmail(generateUnique());
              const memberToken = await authenticate(memberEmail).then(r => r.access_token);

              const invitationResult = await inviteToOrganization(
                {
                  organizationSlug: organization.slug,
                  email: memberEmail,
                },
                inviteToken,
              ).then(r => r.expectNoGraphQLErrors());

              const code = invitationResult.inviteToOrganizationByEmail.ok?.code;

              if (!code) {
                throw new Error(
                  `Could not create invitation for ${memberEmail} to join org ${organization.slug}`,
                );
              }

              const joinResult = await joinOrganization(code, memberToken).then(r =>
                r.expectNoGraphQLErrors(),
              );

              if (joinResult.joinOrganization.__typename !== 'OrganizationPayload') {
                throw new Error(
                  `Member ${memberEmail} could not join organization ${organization.slug}`,
                );
              }

              const member = joinResult.joinOrganization.organization.me;

              return {
                member,
                memberEmail,
                memberToken,
                async assignMemberRole(
                  input: {
                    roleId: string;
                    userId: string;
                    resouces?: GraphQLSchema.ResourceAssignmentInput;
                  },
                  options: { useMemberToken?: boolean } = {
                    useMemberToken: false,
                  },
                ) {
                  const memberRoleAssignmentResult = await assignMemberRole(
                    {
                      organizationSlug: organization.slug,
                      userId: input.userId,
                      roleId: input.roleId,
                      resources: input.resouces ?? {
                        mode: GraphQLSchema.ResourceAssignmentMode.All,
                        projects: [],
                      },
                    },
                    options.useMemberToken ? memberToken : ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  if (memberRoleAssignmentResult.assignMemberRole.error) {
                    throw new Error(memberRoleAssignmentResult.assignMemberRole.error.message);
                  }

                  return memberRoleAssignmentResult.assignMemberRole.ok?.updatedMember;
                },
                async deleteMemberRole(
                  roleId: string,
                  options: { useMemberToken?: boolean } = {
                    useMemberToken: false,
                  },
                ) {
                  const memberRoleDeletionResult = await deleteMemberRole(
                    {
                      organizationSlug: organization.slug,
                      roleId,
                    },
                    options.useMemberToken ? memberToken : ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  if (memberRoleDeletionResult.deleteMemberRole.error) {
                    throw new Error(memberRoleDeletionResult.deleteMemberRole.error.message);
                  }

                  return memberRoleDeletionResult.deleteMemberRole.ok?.updatedOrganization;
                },
                async createMemberRole(
                  permissions: Array<string>,
                  options: { useMemberToken?: boolean } = {
                    useMemberToken: false,
                  },
                ) {
                  const name = humanId({
                    separator: '',
                    adjectiveCount: 1,
                    addAdverb: true,
                    capitalize: true,
                  });
                  const memberRoleCreationResult = await createMemberRole(
                    {
                      organizationSlug: organization.slug,
                      name,
                      description: 'some description',
                      selectedPermissions: permissions,
                    },
                    options.useMemberToken ? memberToken : ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  if (memberRoleCreationResult.createMemberRole.error) {
                    if (memberRoleCreationResult.createMemberRole.error.inputErrors?.name) {
                      throw new Error(
                        memberRoleCreationResult.createMemberRole.error.inputErrors.name,
                      );
                    }
                    if (memberRoleCreationResult.createMemberRole.error.inputErrors?.description) {
                      throw new Error(
                        memberRoleCreationResult.createMemberRole.error.inputErrors.description,
                      );
                    }

                    throw new Error(memberRoleCreationResult.createMemberRole.error.message);
                  }

                  const createdRole =
                    memberRoleCreationResult.createMemberRole.ok?.updatedOrganization.memberRoles?.find(
                      r => r.name === name,
                    );

                  if (!createdRole) {
                    throw new Error(
                      `Could not find created member role for org ${organization.slug}`,
                    );
                  }

                  return createdRole;
                },
                async updateMemberRole(
                  role: {
                    id: string;
                    name: string;
                    description: string;
                  },
                  permissions: Array<string>,
                  options: { useMemberToken?: boolean } = {
                    useMemberToken: false,
                  },
                ) {
                  const memberRoleUpdateResult = await updateMemberRole(
                    {
                      organizationSlug: organization.slug,
                      roleId: role.id,
                      name: role.name,
                      description: role.description,
                      selectedPermissions: permissions,
                    },
                    options.useMemberToken ? memberToken : ownerToken,
                  ).then(r => r.expectNoGraphQLErrors());

                  if (memberRoleUpdateResult.updateMemberRole.error) {
                    if (memberRoleUpdateResult.updateMemberRole.error.inputErrors?.name) {
                      throw new Error(
                        memberRoleUpdateResult.updateMemberRole.error.inputErrors.name,
                      );
                    }
                    if (memberRoleUpdateResult.updateMemberRole.error.inputErrors?.description) {
                      throw new Error(
                        memberRoleUpdateResult.updateMemberRole.error.inputErrors.description,
                      );
                    }

                    throw new Error(memberRoleUpdateResult.updateMemberRole.error.message);
                  }

                  const updatedRole = memberRoleUpdateResult.updateMemberRole.ok?.updatedRole;

                  if (!updatedRole) {
                    throw new Error(
                      `Could not find the updated member role for org ${organization.slug}`,
                    );
                  }

                  return updatedRole;
                },
              };
            },
          };
        },
      };
    },
  };
}

type TargetOverwrite = {
  __typename?: 'Target';
  id: string;
  slug: string;
};
