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

console.log('Create 100 projects');
await PromisePool.withConcurrency(10)
  .for(new Array(100).fill(null))
  .process(() => org.createProject());

console.log('Create 200 organization members');
await PromisePool.withConcurrency(10)
  .for(new Array(100).fill(null))
  .process(() => org.inviteAndJoinMember());

console.log(`
Seed User Credentials:

Email: ${owner.ownerEmail}
Password: ${password}
`);
