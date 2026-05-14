// eslint-disable-next-line import/no-extraneous-dependencies -- required before loading seed helpers
import 'reflect-metadata';
import { config } from 'dotenv';

if (
  process.env.RUN_AGAINST_LOCAL_SERVICES !== '1' &&
  process.env.HIVE_APP_BASE_URL?.startsWith('http://localhost:3000')
) {
  process.env.RUN_AGAINST_LOCAL_SERVICES = '1';
}

config({
  path:
    process.env.RUN_AGAINST_LOCAL_SERVICES === '1'
      ? new URL('../packages/services/server/.env.template', import.meta.url).pathname
      : new URL('../integration-tests/.env', import.meta.url).pathname,
});

function writeResult(value: unknown): Promise<never> {
  return new Promise(() => {
    process.stdout.write(JSON.stringify(value), () => {
      process.exit(0);
    });
  });
}

async function main() {
  const [, , task, rawInput = 'null'] = process.argv;
  const input = JSON.parse(rawInput) as unknown;
  const seedPath = '../integration-tests/testkit/seed.ts';
  const { initSeed } = (await import(seedPath)) as {
    initSeed: () => {
      createOwner(): Promise<any>;
      purgeOIDCDomains(): Promise<void>;
      purgeUserByEmail(email: string): Promise<void>;
      forgeOIDCDNSChallenge(orgSlug: string): Promise<void>;
      pollForEmailVerificationLink(input: string | { email: string; now: number }): Promise<URL>;
    };
  };
  const seed = initSeed();

  if (task === 'seedOrg') {
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    await writeResult({
      slug: org.organization.slug,
      accessToken: owner.ownerToken,
      refreshToken: owner.ownerRefreshToken,
      email: owner.ownerEmail,
    });
  }

  if (task === 'seedTarget') {
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const project = await org.createProject();
    await writeResult({
      slug: `${org.organization.slug}/${project.project.slug}/${project.target.slug}`,
      accessToken: owner.ownerToken,
      refreshToken: owner.ownerRefreshToken,
      email: owner.ownerEmail,
    });
  }

  if (task === 'getEmailConfirmationLink') {
    const url = await seed.pollForEmailVerificationLink(
      input as string | { email: string; now: number },
    );
    await writeResult(url.pathname + url.search);
  }

  if (task === 'purgeOIDCDomains') {
    await seed.purgeOIDCDomains();
    await writeResult(null);
  }

  if (task === 'purgeUserByEmail') {
    await seed.purgeUserByEmail(input as string);
    await writeResult(null);
  }

  if (task === 'forgeOIDCDNSChallenge') {
    await seed.forgeOIDCDNSChallenge(input as string);
    await writeResult(null);
  }

  throw new Error(`Unknown seed task: ${task}`);
}

main().catch(error => {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
