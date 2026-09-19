/**
 * Replays a schema history against one target: versions and checks spread over the last few
 * weeks, and on a federation project the contracts, their versions and their failures too.
 *
 * `TARGET=<target id> pnpm seed:history`
 *
 * Prompts for the email of a local user who is a member of the target's organization (or set
 * OWNER_EMAIL). Needs docker compose and the server, schema and app services running. Safe to run
 * on a target that already has versions: the seeded history lands after the newest existing one.
 */
// The testkit reaches @hive/api internals that use class decorators, so this must load first.
import 'reflect-metadata';
import { ResourceAssignmentModeType } from '../../integration-tests/testkit/gql/graphql';

process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
await import('../../integration-tests/local-dev.ts');

const { createPostgresDatabasePool, psql } = await import('@hive/postgres');
const { getOrCreateAuth, getSeedPGConnectionString } = await import('../utils/get-or-create-auth');
const { promptForEmail } = await import('../utils/prompt-for-email');
const {
  checkSchema,
  createContract,
  createOrganizationAccessToken,
  publishSchema,
  updateSchemaComposition,
} = await import('../../integration-tests/testkit/flow');
const { federation, single } = await import('./storylines');

const DAY = 24 * 60 * 60 * 1000;
const appUrl = process.env.HIVE_APP_BASE_URL ?? 'http://localhost:3000';

const targetId = process.env.TARGET;
if (!targetId) {
  throw new Error('Set TARGET to the target id (Target Settings shows it).');
}

const pool = await createPostgresDatabasePool({
  connectionParameters: getSeedPGConnectionString(),
});
// The token only exists for this run; it goes when the run does, whichever way it ends.
let seedTokenId: string | null = null;

try {
  const target = (await pool.maybeOne(psql`
    SELECT t."id"
      , t."clean_id" AS "targetSlug"
      , p."id" AS "projectId"
      , p."clean_id" AS "projectSlug"
      , p."type"
      , p."native_federation" AS "nativeFederation"
      , o."id" AS "orgId"
      , o."clean_id" AS "orgSlug"
    FROM "targets" t
    JOIN "projects" p ON p."id" = t."project_id"
    JOIN "organizations" o ON o."id" = p."org_id"
    WHERE t."id" = ${targetId}
  `)) as {
    id: string;
    targetSlug: string;
    projectId: string;
    projectSlug: string;
    type: 'SINGLE' | 'FEDERATION' | 'STITCHING';
    nativeFederation: boolean;
    orgId: string;
    orgSlug: string;
  } | null;
  if (!target) {
    throw new Error(`No target with id ${targetId}.`);
  }
  if (target.type === 'STITCHING') {
    throw new Error('Stitching projects are not supported by this seed.');
  }
  const storyline = target.type === 'FEDERATION' ? federation : single;
  const pageUrl = `${appUrl}/${target.orgSlug}/${target.projectSlug}/${target.targetSlug}`;

  console.log(`
  Target:     ${target.orgSlug}/${target.projectSlug}/${target.targetSlug} (${target.type})
  Storyline:  ${storyline.title}
`);

  const email =
    process.env.OWNER_EMAIL ||
    (await promptForEmail('Email of a local user in this organization: '));
  const auth = await getOrCreateAuth(email);
  if (!auth.isExistingUser) {
    throw new Error(
      `${email} is a new user and cannot act in ${target.orgSlug}. Use a member's email.`,
    );
  }
  const ownerToken = auth.access_token;

  // Contracts need native composition; a federation project created in the UI already has it.
  if (target.type === 'FEDERATION' && !target.nativeFederation) {
    const result = await updateSchemaComposition(
      { project: { byId: target.projectId }, method: { native: true } },
      ownerToken,
    ).then(r => r.expectNoGraphQLErrors());
    if (result.updateSchemaComposition.error) {
      throw new Error(
        `Could not enable native composition: ${result.updateSchemaComposition.error.message}`,
      );
    }
    console.log('  Enabled native composition on the project.');
  }

  const tokenResult = await createOrganizationAccessToken(
    {
      organization: { byId: target.orgId },
      // Titles allow letters, digits, space, underscore and hyphen only.
      title: `seed history ${target.projectSlug} ${target.targetSlug}`.slice(0, 100),
      description: 'Publishes and checks the seeded history. Safe to delete.',
      permissions: [
        'organization:describe',
        'project:describe',
        'schema:compose',
        'schemaCheck:create',
        'schemaVersion:publish',
      ],
      resources: {
        mode: ResourceAssignmentModeType.Granular,
        projects: [
          {
            projectId: target.projectId,
            targets: {
              mode: ResourceAssignmentModeType.Granular,
              targets: [
                {
                  targetId: target.id,
                  services: { mode: ResourceAssignmentModeType.All },
                  appDeployments: { mode: ResourceAssignmentModeType.All },
                },
              ],
            },
          },
        ],
      },
    },
    ownerToken,
  ).then(r => r.expectNoGraphQLErrors());
  if (tokenResult.createOrganizationAccessToken.error) {
    throw new Error(tokenResult.createOrganizationAccessToken.error.message);
  }
  const registryToken = tokenResult.createOrganizationAccessToken.ok!.privateAccessKey;
  seedTokenId = tokenResult.createOrganizationAccessToken.ok!.createdOrganizationAccessToken.id;
  if (process.env.SEED_DEBUG) {
    console.log(`  Registry token: ${registryToken}`);
  }

  const existingContracts = new Set(
    (await pool.anyFirst(psql`
      SELECT "contract_name" FROM "contracts"
      WHERE "target_id" = ${target.id} AND "is_disabled" = false
    `)) as string[],
  );

  // Everything is written at "now" and stamped afterwards. If the target already has versions the
  // storyline is compressed into the time since the newest one, so the diffs stay in order.
  const latestExisting = (await pool.maybeOneFirst(psql`
    SELECT max("created_at") FROM "schema_versions" WHERE "target_id" = ${target.id}
  `)) as string | number | null;
  const span = Math.max(...storyline.events.map(event => event.daysAgo)) * DAY;
  const now = Date.now();
  const room = latestExisting ? now - new Date(latestExisting).getTime() - 60 * 1000 : span;
  // Below a day there is no history to spread, so the rows keep the time they were written.
  const scale = room < DAY ? 0 : Math.min(1, room / span);
  if (scale === 0) {
    console.log('  The target has a version from the last day; timestamps are left as written.\n');
  } else if (scale < 1) {
    console.log(
      `  The target already has versions; the storyline is compressed into the last ${Math.round((room / DAY) * 10) / 10} days.\n`,
    );
  }
  const stampFor = (daysAgo: number) => new Date(now - daysAgo * scale * DAY);

  const written: Array<{
    kind: 'version' | 'check';
    id: string;
    at: Date;
    url: string;
    label: string;
  }> = [];

  for (const event of storyline.events) {
    if (event.kind === 'contract') {
      if (existingContracts.has(event.name)) {
        console.log(`  contract ${event.name}: already there`);
        continue;
      }
      const result = await createContract(
        {
          target: { byId: target.id },
          contractName: event.name,
          includeTags: event.includeTags,
          removeUnreachableTypesFromPublicApiSchema: true,
        },
        ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      if (result.createContract.error) {
        throw new Error(`Contract ${event.name}: ${result.createContract.error.message}`);
      }
      console.log(`  contract ${event.name}: created`);
      continue;
    }

    const label = `${event.service ?? 'schema'} by ${event.author}: ${event.expect}`;

    if (event.kind === 'publish') {
      const result = await publishSchema(
        {
          author: event.author,
          commit: event.commit,
          sdl: event.sdl,
          service: event.service,
          url: event.service ? `https://${event.service}.storefront.local/graphql` : undefined,
          target: { byId: target.id },
        },
        registryToken,
      ).then(r => r.expectNoGraphQLErrors());
      const publish = result.schemaPublish;
      if (publish.__typename !== 'SchemaPublishSuccess') {
        throw new Error(
          `Publish (${label}) returned ${publish.__typename}: ${JSON.stringify(publish)}`,
        );
      }
      // The publish result links to the target on a federation project, so the version is read back.
      const id = (await pool.oneFirst(psql`
        SELECT "id" FROM "schema_versions" WHERE "target_id" = ${target.id}
        ORDER BY "created_at" DESC LIMIT 1
      `)) as string;
      written.push({
        kind: 'version',
        id,
        at: stampFor(event.daysAgo),
        url: `${pageUrl}/history/${id}`,
        label,
      });
      console.log(`  publish ${event.service ?? ''}: ${publish.__typename}`);
      continue;
    }

    const result = await checkSchema(
      {
        sdl: event.sdl,
        service: event.service,
        target: { byId: target.id },
        meta: { author: event.author, commit: event.commit },
      },
      registryToken,
    ).then(r => r.expectNoGraphQLErrors());
    const check = result.schemaCheck;
    const id = 'schemaCheck' in check ? check.schemaCheck?.id : null;
    if (!id) {
      throw new Error(`Check (${label}) returned ${check.__typename}: ${JSON.stringify(check)}`);
    }
    written.push({
      kind: 'check',
      id,
      at: stampFor(event.daysAgo),
      url: `${pageUrl}/checks/${id}`,
      label,
    });
    console.log(`  check ${event.service ?? ''}: ${check.__typename}`);
  }

  console.log('\n  Stamping timestamps...');
  for (const row of scale === 0 ? [] : written) {
    const at = row.at.toISOString();
    if (row.kind === 'version') {
      await pool.query(psql`
        UPDATE "schema_versions" SET "created_at" = ${at}::timestamptz WHERE "id" = ${row.id}
      `);
      await pool.query(psql`
        UPDATE "schema_log" SET "created_at" = ${at}::timestamptz
        WHERE "id" = (SELECT "action_id" FROM "schema_versions" WHERE "id" = ${row.id})
      `);
      await pool.query(psql`
        UPDATE "contract_versions" SET "created_at" = ${at}::timestamptz
        WHERE "schema_version_id" = ${row.id}
      `);
    } else {
      await pool.query(psql`
        UPDATE "schema_checks" SET "created_at" = ${at}::timestamptz WHERE "id" = ${row.id}
      `);
    }
  }

  console.log('\n  Written, newest first:\n');
  for (const row of [...written].reverse()) {
    console.log(`  ${row.at.toISOString().slice(0, 10)}  ${row.kind.padEnd(7)}  ${row.label}`);
    console.log(`              ${row.url}`);
  }
  console.log(`
  History:  ${pageUrl}/history
  Checks:   ${pageUrl}/checks
`);
} finally {
  if (seedTokenId) {
    await pool.query(psql`DELETE FROM "organization_access_tokens" WHERE "id" = ${seedTokenId}`);
  }
  await pool.end();
}
