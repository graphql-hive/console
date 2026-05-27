// eslint-disable-next-line import/no-extraneous-dependencies -- required before loading seed helpers
import 'reflect-metadata';
import { createInterface } from 'node:readline';
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

type SeedTask =
  | 'seedOrg'
  | 'seedTarget'
  | 'getEmailConfirmationLink'
  | 'purgeOIDCDomains'
  | 'purgeUserByEmail'
  | 'forgeOIDCDNSChallenge';

type RequestMessage = {
  id: number;
  task: SeedTask;
  input: unknown;
};

const { initSeed } = await import('../integration-tests/testkit/seed');
const seed = initSeed();

async function executeTask(task: SeedTask, input: unknown) {
  if (task === 'seedOrg') {
    const owner = await seed.createOwner();
    const org = await owner.createOrg();

    return {
      slug: org.organization.slug,
      accessToken: owner.ownerToken,
      refreshToken: owner.ownerRefreshToken,
      email: owner.ownerEmail,
    };
  }

  if (task === 'seedTarget') {
    const owner = await seed.createOwner();
    const org = await owner.createOrg();
    const project = await org.createProject();

    return {
      slug: `${org.organization.slug}/${project.project.slug}/${project.target.slug}`,
      accessToken: owner.ownerToken,
      refreshToken: owner.ownerRefreshToken,
      email: owner.ownerEmail,
    };
  }

  if (task === 'getEmailConfirmationLink') {
    const url = await seed.pollForEmailVerificationLink(
      input as string | { email: string; now: number },
    );

    return url.pathname + url.search;
  }

  if (task === 'purgeOIDCDomains') {
    await seed.purgeOIDCDomains();
    return null;
  }

  if (task === 'purgeUserByEmail') {
    await seed.purgeUserByEmail(input as string);
    return null;
  }

  if (task === 'forgeOIDCDNSChallenge') {
    await seed.forgeOIDCDNSChallenge(input as string);
    return null;
  }

  throw new Error(`Unknown seed task: ${task satisfies never}`);
}

function writeResponse(value: unknown) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

const lines = createInterface({
  input: process.stdin,
  terminal: false,
});

for await (const line of lines) {
  const request = JSON.parse(line) as RequestMessage;

  try {
    writeResponse({
      id: request.id,
      ok: true,
      value: await executeTask(request.task, request.input),
    });
  } catch (error) {
    writeResponse({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.stack || error.message : String(error),
    });
  }
}
