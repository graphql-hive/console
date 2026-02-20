import { CommonQueryMethods, SerializableValue, SqlTaggedTemplate } from 'slonik';
import z from 'zod';
import { type MigrationExecutor } from '../pg-migrator';

const UserModel = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  external_auth_user_id: z.string().nullable(),
  supertoken_user_id: z.string().uuid().nullable(),
  oidc_integration_id: z.string().nullable(),
  is_admin: z.boolean().nullable(),
  zendesk_user_id: z.string().nullable(),
  created_at: z.string(),
});
type User = z.output<typeof UserModel>;

const WildcardAssignmentModeModel = z.literal('*');
const GranularAssignmentModeModel = z.literal('granular');

const WildcardResourceAssignmentModel = z.object({
  mode: WildcardAssignmentModeModel,
});

const ServiceAssignmentModel = z.object({
  type: z.literal('service'),
  serviceName: z.string(),
});
type ServiceAssignment = z.output<typeof ServiceAssignmentModel>;

const AppDeploymentAssignmentModel = z.object({
  type: z.literal('appDeployment'),
  appName: z.string(),
});
type AppDeploymentAssignment = z.output<typeof AppDeploymentAssignmentModel>;

const AssignedServicesModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    services: z
      .array(ServiceAssignmentModel)
      .optional()
      .nullable()
      .transform(value => value ?? []),
  }),
  WildcardResourceAssignmentModel,
]);
type AssignedServices = z.output<typeof AssignedServicesModel>;

const AssignedAppDeploymentsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    appDeployments: z
      .array(AppDeploymentAssignmentModel)
      .optional()
      .nullable()
      .transform(value => value ?? []),
  }),
  WildcardResourceAssignmentModel,
]);
type AssignedAppDeployments = z.output<typeof AssignedAppDeploymentsModel>;

const TargetAssignmentModel = z.object({
  type: z.literal('target'),
  id: z.string().uuid(),
  services: AssignedServicesModel,
  appDeployments: AssignedAppDeploymentsModel,
});
type AssignedTarget = z.output<typeof TargetAssignmentModel>;

const AssignedTargetsModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    targets: z.array(TargetAssignmentModel),
  }),
  WildcardResourceAssignmentModel,
]);
type AssignedTargets = z.output<typeof AssignedTargetsModel>;

const ProjectAssignmentModel = z.object({
  type: z.literal('project'),
  id: z.string().uuid(),
  targets: AssignedTargetsModel,
});
type ProjectAssignment = z.output<typeof ProjectAssignmentModel>;

const ResourceAssignmentModel = z.union([
  z.object({
    mode: GranularAssignmentModeModel,
    projects: z.array(ProjectAssignmentModel),
  }),
  WildcardResourceAssignmentModel,
]);
type ResourceAssignmentGroup = z.output<typeof ResourceAssignmentModel>;

const ParsedResourceAssignmentModel = ResourceAssignmentModel.nullable().transform(
  value => value ?? { mode: '*' as const },
);

const OrgMembershipModel = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.string(),
  scopes: z.string().array().nullable(),
  connected_to_zendesk: z.boolean(),
  role_id: z.string().uuid(),
  role_name: z.string(),
  role_scopes: z.string().array().nullable(),
  role_permissions: z.string().array().nullable(),
  assigned_resources: z.unknown().transform(v => v as SerializableValue),
  created_at: z.number().transform(v => new Date(v)),
});
type OrgMembership = z.output<typeof OrgMembershipModel>;

// Account merging migration
// Plan documentation: https://www.notion.so/theguildoss/2aab6b71848a80b5af67ede28c7b41
export default {
  name: '2026.02.10-00-00.account-merging.ts',
  noTransaction: true,
  async run({ sql, connection }) {
    let lastUser: User | undefined;
    do {
      const userBatch = await connection
        .any<unknown>(
          sql`
            SELECT DISTINCT ON ("email")
              "id"
              , "email"
              , "external_auth_user_id"
              , "supertoken_user_id"
              , "oidc_integration_id"
              , "is_admin"
              , "zendesk_user_id"
              , TO_CHAR("created_at", 'YYYY-MM-DD HH24:MI:SS.USOF') "created_at"
            FROM "users"
            ${
              lastUser
                ? sql`WHERE ("email", "created_at", "id") > (${lastUser.email}, ${lastUser.created_at}::timestamptz, ${lastUser.id})`
                : sql``
            }
            ORDER BY "email", "created_at", "id"
            LIMIT 100;
          `,
        )
        .then(arr => arr.map(user => UserModel.parse(user)));
      lastUser = userBatch.at(-1);

      await Promise.all(
        userBatch.map(user =>
          processUser(user, sql, connection).catch(e => {
            console.warn(`Migration for user ${user.id} aborted:`, e);
          }),
        ),
      );
    } while (lastUser);
  },
} satisfies MigrationExecutor;

async function processUser(
  primaryUser: User,
  sql: SqlTaggedTemplate,
  connection: CommonQueryMethods,
) {
  return await connection.transaction(async t => {
    const mergeableUsers = await t
      .any<unknown>(
        sql`
          SELECT
            "id"
            , "email"
            , "external_auth_user_id"
            , "supertoken_user_id"
            , "oidc_integration_id"
            , "is_admin"
            , "zendesk_user_id"
            , TO_CHAR("created_at", 'YYYY-MM-DD HH24:MI:SS.USOF') "created_at"
          FROM "users"
          WHERE "email" = ${primaryUser.email}
        `,
      )
      .then(arr => arr.map(user => UserModel.parse(user)));
    const mergeableUserIds = mergeableUsers.map(user => user.id);
    if (mergeableUsers.length <= 1) return;

    // Update the primary user's values to be merged as needed
    await t.query(sql`
      UPDATE "users"
      SET
        "external_auth_user_id" = NULL
        , "supertoken_user_id" = NULL
        , "oidc_integration_id" = NULL
        , "is_admin" = ${mergeableUsers.some(u => u.is_admin)}
        , "zendesk_user_id" = ${mergeableUsers.find(u => u.zendesk_user_id)?.zendesk_user_id ?? null}
      WHERE "id" = ${primaryUser.id}
    `);

    // Link the existing SuperTokens identities to the primary user
    const unlinkedSuperTokensIds = mergeableUsers.filter(user => user.supertoken_user_id);
    if (unlinkedSuperTokensIds.length) {
      await t.query(sql`
        INSERT INTO "users_linked_identities" ("user_id", "identity_id")
        VALUES ${sql.join(
          unlinkedSuperTokensIds.map(user => sql`(${primaryUser.id}, ${user.supertoken_user_id})`),
          sql`,`,
        )}
        ON CONFLICT DO NOTHING
      `);
    }

    // Merge organization memberships. this is the most complex part of the migration.
    const orgMemberships = await t
      .any<unknown>(
        sql`
          SELECT
            "om"."organization_id"
            , "om"."user_id"
            , "om"."role"
            , "om"."scopes"
            , "om"."connected_to_zendesk"
            , "om"."role_id"
            , "omr"."name" "role_name"
            , "omr"."scopes" "role_scopes"
            , "omr"."permissions" "role_permissions"
            , "om"."assigned_resources"
            , "om"."created_at"
          FROM "organization_member" "om"
          LEFT JOIN "organization_member_roles" "omr"
            ON "omr"."organization_id" = "om"."organization_id"
            AND "omr"."id" = "om"."role_id"
          WHERE "om"."user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
          ORDER BY "om"."created_at"
        `,
      )
      .then(arr => arr.map(m => OrgMembershipModel.parse(m)))
      .then(arr => Object.groupBy(arr, m => m.organization_id));

    for (const [orgId, memberships] of Object.entries(orgMemberships)) {
      if (!memberships || !memberships.length) continue;
      // if only one membership exists, link it to the primary user
      if (memberships.length === 1) {
        if (memberships[0].user_id !== primaryUser.id) {
          await t.query(
            sql`
              UPDATE "organization_member"
              SET "user_id" = ${primaryUser.id}
              WHERE "organization_id" = ${orgId}
                AND "user_id" = ${memberships[0].user_id}
            `,
          );
        }
      } else {
        // merge all memberships into the oldest one. others will be deleted
        const targetMembership = memberships[0];
        const otherMemberships = memberships.slice(1);
        const updatedMembership = structuredClone(targetMembership);

        // do the simple merges first
        updatedMembership.user_id = primaryUser.id;
        updatedMembership.role = 'MEMBER';
        updatedMembership.scopes = null;
        updatedMembership.connected_to_zendesk = memberships.some(m => m.connected_to_zendesk);

        // complex merges are extracted out
        updatedMembership.role_id = determineRole(memberships);
        updatedMembership.assigned_resources = mergeAssignedResourcesForRole(
          memberships,
          updatedMembership.role_id,
        );

        // delete others than the target membership, and write the updates to the target
        await t.query(sql`
          DELETE FROM "organization_member"
          WHERE "organization_id" = ${orgId}
            AND "user_id" = ANY(${sql.array(
              otherMemberships.map(m => m.user_id),
              'uuid',
            )})
        `);
        await t.query(sql`
          UPDATE "organization_member"
          SET
            "user_id" = ${updatedMembership.user_id}
            , "role" = ${updatedMembership.role}
            , "scopes" = ${updatedMembership.scopes}
            , "connected_to_zendesk" = ${updatedMembership.connected_to_zendesk}
            , "role_id" = ${updatedMembership.role_id}
            , "assigned_resources" = ${sql.jsonb(updatedMembership.assigned_resources)}
          WHERE "organization_id" = ${targetMembership.organization_id}
            AND "user_id" = ${targetMembership.user_id}
        `);
      }
    }
    // end of membership merging

    // rewrite all other foreign keys
    await t.query(sql`
      UPDATE "users_linked_identities"
      SET "user_id" = ${primaryUser.id}
      WHERE "user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);
    await t.query(sql`
      UPDATE "organizations"
      SET "user_id" = ${primaryUser.id}
      WHERE "user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);
    await t.query(sql`
      UPDATE "organizations"
      SET "ownership_transfer_user_id" = ${primaryUser.id}
      WHERE "ownership_transfer_user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);
    await t.query(sql`
      UPDATE "organization_access_tokens"
      SET "user_id" = ${primaryUser.id}
      WHERE "user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);
    await t.query(sql`
      UPDATE "schema_checks"
      SET "manual_approval_user_id" = ${primaryUser.id}
      WHERE "manual_approval_user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);
    await t.query(sql`
      UPDATE "document_collections"
      SET "created_by_user_id" = ${primaryUser.id}
      WHERE "created_by_user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);
    await t.query(sql`
      UPDATE "document_collection_documents"
      SET "created_by_user_id" = ${primaryUser.id}
      WHERE "created_by_user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);
    await t.query(sql`
      UPDATE "document_preflight_scripts"
      SET "created_by_user_id" = ${primaryUser.id}
      WHERE "created_by_user_id" = ANY(${sql.array(mergeableUserIds, 'uuid')})
    `);

    // Delete the non-primary users
    await t.query(sql`
      DELETE FROM "users"
      WHERE "id" = ANY(${sql.array(
        mergeableUserIds.filter(id => id !== primaryUser.id),
        'uuid',
      )});
    `);
  });
}

function determineRole(memberships: OrgMembership[]): string {
  // start by compacting the data for less cognitive load
  const membershipRoles = memberships.map(m => ({
    id: m.role_id,
    name: m.role_name,
    scopes: m.role_scopes && new Set(m.role_scopes),
    permissions: m.role_permissions && new Set(m.role_permissions),
  }));
  type Role = (typeof membershipRoles)[number];

  // if any of the membership role is admin, use it
  const adminRole = membershipRoles.find(r => r.name === 'Admin');
  if (adminRole) {
    return adminRole.id;
  }

  const uniqueRoles = Array.from(
    membershipRoles
      .reduce((map, r) => {
        if (!map.get(r.id)) {
          map.set(r.id, r);
        }
        return map;
      }, new Map<string, Role>())
      .values(),
  );
  // if all memberships have the same role, use it
  if (uniqueRoles.length === 1) {
    return uniqueRoles[0].id;
  }
  const uniqueRolesWithoutViewer = uniqueRoles.filter(r => r.name !== 'Viewer');
  // if all non-viewer memberships have the same role, use it
  if (uniqueRolesWithoutViewer.length === 1) {
    return uniqueRolesWithoutViewer[0].id;
  }

  // if a superset role exists, use it
  let supersetRole: Role | undefined;
  for (const role of uniqueRolesWithoutViewer) {
    if (!supersetRole) {
      supersetRole = role;
      continue;
    }

    // both should be scopes-based or permissions-based in order to merge correctly
    if (supersetRole.scopes && role.scopes) {
      if (supersetRole.scopes.isSupersetOf(role.scopes)) {
        continue;
      }
      if (role.scopes.isSupersetOf(supersetRole.scopes)) {
        supersetRole = role;
        continue;
      }
    } else if (supersetRole.permissions && role.permissions) {
      if (supersetRole.permissions.isSupersetOf(role.permissions)) {
        continue;
      }
      if (role.permissions.isSupersetOf(supersetRole.permissions)) {
        supersetRole = role;
        continue;
      }
    }

    supersetRole = undefined;
    break;
  }
  if (supersetRole) {
    return supersetRole.id;
  }

  throw new Error(
    `cannot determine role to use between: [${membershipRoles.map(role => role.id).join(', ')}]`,
  );
}

function mergeAssignedResourcesForRole(
  memberships: ReadonlyArray<OrgMembership>,
  roleId: string,
): ResourceAssignmentGroup {
  const roleMemberships = memberships.filter(membership => membership.role_id === roleId);

  if (roleMemberships.length === 0) {
    throw new Error(`expected at least one membership for resolved role ${roleId}`);
  }

  const assignments = roleMemberships.map(parseAssignedResources);
  return mergeResourceAssignmentGroups(assignments);
}

function parseAssignedResources(membership: OrgMembership): ResourceAssignmentGroup {
  const parsed = ParsedResourceAssignmentModel.safeParse(membership.assigned_resources);

  if (parsed.success) {
    return parsed.data;
  }

  throw new Error(
    'invalid assigned_resources for membership ' +
      `(org=${membership.organization_id}, user=${membership.user_id}): ` +
      parsed.error.issues.map(issue => issue.message).join('; '),
  );
}

function mergeResourceAssignmentGroups(
  assignments: ReadonlyArray<ResourceAssignmentGroup>,
): ResourceAssignmentGroup {
  return assignments.reduce<ResourceAssignmentGroup>(
    (previous, current) => mergeResourceAssignment(previous, current),
    {
      mode: 'granular',
      projects: [],
    },
  );
}

function mergeResourceAssignment(
  previous: ResourceAssignmentGroup,
  current: ResourceAssignmentGroup,
): ResourceAssignmentGroup {
  if (previous.mode === '*' || current.mode === '*') {
    return { mode: '*' };
  }

  const projects = new Map<string, ProjectAssignment>();

  for (const project of previous.projects) {
    projects.set(project.id, cloneProjectAssignment(project));
  }

  for (const project of current.projects) {
    const merged = projects.get(project.id);
    if (!merged) {
      projects.set(project.id, cloneProjectAssignment(project));
      continue;
    }

    merged.targets = mergeAssignedTargets(merged.targets, project.targets);
  }

  return {
    mode: 'granular',
    projects: Array.from(projects.values()),
  };
}

function mergeAssignedTargets(
  previous: AssignedTargets,
  current: AssignedTargets,
): AssignedTargets {
  if (previous.mode === '*' || current.mode === '*') {
    return { mode: '*' };
  }

  const targets = new Map<string, AssignedTarget>();

  for (const target of previous.targets) {
    targets.set(target.id, cloneTargetAssignment(target));
  }

  for (const target of current.targets) {
    const merged = targets.get(target.id);

    if (!merged) {
      targets.set(target.id, cloneTargetAssignment(target));
      continue;
    }

    merged.services = mergeAssignedServices(merged.services, target.services);
    merged.appDeployments = mergeAssignedAppDeployments(
      merged.appDeployments,
      target.appDeployments,
    );
  }

  return {
    mode: 'granular',
    targets: Array.from(targets.values()),
  };
}

function mergeAssignedServices(
  previous: AssignedServices,
  current: AssignedServices,
): AssignedServices {
  if (previous.mode === '*' || current.mode === '*') {
    return { mode: '*' };
  }

  const services = new Map<string, ServiceAssignment>();

  for (const service of previous.services) {
    services.set(service.serviceName, {
      type: 'service',
      serviceName: service.serviceName,
    });
  }

  for (const service of current.services) {
    if (!services.has(service.serviceName)) {
      services.set(service.serviceName, {
        type: 'service',
        serviceName: service.serviceName,
      });
    }
  }

  return {
    mode: 'granular',
    services: Array.from(services.values()),
  };
}

function mergeAssignedAppDeployments(
  previous: AssignedAppDeployments,
  current: AssignedAppDeployments,
): AssignedAppDeployments {
  if (previous.mode === '*' || current.mode === '*') {
    return { mode: '*' };
  }

  const appDeployments = new Map<string, AppDeploymentAssignment>();

  for (const appDeployment of previous.appDeployments) {
    appDeployments.set(appDeployment.appName, {
      type: 'appDeployment',
      appName: appDeployment.appName,
    });
  }

  for (const appDeployment of current.appDeployments) {
    if (!appDeployments.has(appDeployment.appName)) {
      appDeployments.set(appDeployment.appName, {
        type: 'appDeployment',
        appName: appDeployment.appName,
      });
    }
  }

  return {
    mode: 'granular',
    appDeployments: Array.from(appDeployments.values()),
  };
}

function cloneProjectAssignment(project: ProjectAssignment): ProjectAssignment {
  return {
    type: 'project',
    id: project.id,
    targets: cloneAssignedTargets(project.targets),
  };
}

function cloneAssignedTargets(targets: AssignedTargets): AssignedTargets {
  if (targets.mode === '*') {
    return { mode: '*' };
  }

  return {
    mode: 'granular',
    targets: targets.targets.map(target => cloneTargetAssignment(target)),
  };
}

function cloneTargetAssignment(target: AssignedTarget): AssignedTarget {
  return {
    type: 'target',
    id: target.id,
    services: cloneAssignedServices(target.services),
    appDeployments: cloneAssignedAppDeployments(target.appDeployments),
  };
}

function cloneAssignedServices(services: AssignedServices): AssignedServices {
  if (services.mode === '*') {
    return { mode: '*' };
  }

  return {
    mode: 'granular',
    services: services.services.map(service => ({
      type: 'service',
      serviceName: service.serviceName,
    })),
  };
}

function cloneAssignedAppDeployments(
  appDeployments: AssignedAppDeployments,
): AssignedAppDeployments {
  if (appDeployments.mode === '*') {
    return { mode: '*' };
  }

  return {
    mode: 'granular',
    appDeployments: appDeployments.appDeployments.map(appDeployment => ({
      type: 'appDeployment',
      appName: appDeployment.appName,
    })),
  };
}
