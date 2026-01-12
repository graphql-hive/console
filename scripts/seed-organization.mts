/**
 * Script for seeding an org with lot of projects and users.
 *
 * Requirements:
 * - Docker Compose is started (pnpm start)
 * - emails, app and server service is running
 *
 * Recommended method of running this :
 * `bun scripts/seed-organization.mts`
 *
 * Afterwards, log in with the printed credentials.
 */
import { PromisePool } from '@supercharge/promise-pool';

process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
await import('../integration-tests/local-dev.ts');
const { initSeed } = await import('../integration-tests/testkit/seed');

const seed = initSeed();

const owner = await seed.createOwner();
const password = 'ilikebigturtlesandicannotlie47';

const org = await owner.createOrg();

const ITEMS_COUNT = 100;

console.log(`Create ${ITEMS_COUNT}  projects`);

await PromisePool.withConcurrency(10)
  .for(new Array(100).fill(null))
  .process(() => org.createProject());

console.log(`Create ${ITEMS_COUNT}  organization members`);

const RATE_LIMIT_COUNT = 6;
const RATE_LIMIT_WINDOW_MS = 5000;

const members = new Array(ITEMS_COUNT).fill(null);

// Split into batches of 6
const batches = Array.from({ length: Math.ceil(members.length / RATE_LIMIT_COUNT) }, (_, i) =>
  members.slice(i * RATE_LIMIT_COUNT, (i + 1) * RATE_LIMIT_COUNT),
);

// Process each batch sequentially, with items in batch processed concurrently
for (const [index, batch] of batches.entries()) {
  console.log(`Processing batch ${index + 1}/${batches.length}...`);

  await PromisePool.withConcurrency(RATE_LIMIT_COUNT)
    .for(batch)
    .process(() => org.inviteAndJoinMember());

  // Wait between batches (except after the last one)
  if (index < batches.length - 1) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_WINDOW_MS));
  }
}

console.log(`Completed creating ${ITEMS_COUNT} organization members`);

console.log(`
Seed User Credentials:

Email: ${owner.ownerEmail}
Password: ${password}
`);
