// eslint-disable-next-line import/no-extraneous-dependencies -- required before loading seed helpers
import 'reflect-metadata';

async function main() {
  const [, , task, rawInput = 'null'] = process.argv;
  const input = JSON.parse(rawInput) as unknown;
  const seedPath = '../integration-tests/testkit/seed.ts';
  const { initSeed } = (await import(seedPath)) as {
    initSeed: () => {
      createOwner(): Promise<any>;
      purgeOIDCDomains(): Promise<void>;
      forgeOIDCDNSChallenge(orgSlug: string): Promise<void>;
      pollForEmailVerificationLink(input: string | { email: string; now: number }): Promise<URL>;
    };
  };
  const seed = initSeed();

  if (task === 'seedOrg') {
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    process.stdout.write(
      JSON.stringify({
        slug: org.organization.slug,
        refreshToken: owner.ownerRefreshToken,
        email: owner.ownerEmail,
      }),
    );
    return;
  }

  if (task === 'seedTarget') {
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const project = await org.createProject();
    process.stdout.write(
      JSON.stringify({
        slug: `${org.organization.slug}/${project.project.slug}/${project.target.slug}`,
        refreshToken: owner.ownerRefreshToken,
        email: owner.ownerEmail,
      }),
    );
    return;
  }

  if (task === 'getEmailConfirmationLink') {
    const url = await seed.pollForEmailVerificationLink(
      input as string | { email: string; now: number },
    );
    process.stdout.write(JSON.stringify(url.pathname + url.search));
    return;
  }

  if (task === 'purgeOIDCDomains') {
    await seed.purgeOIDCDomains();
    process.stdout.write(JSON.stringify(null));
    return;
  }

  if (task === 'forgeOIDCDNSChallenge') {
    await seed.forgeOIDCDNSChallenge(input as string);
    process.stdout.write(JSON.stringify(null));
    return;
  }

  throw new Error(`Unknown seed task: ${task}`);
}

main().catch(error => {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
