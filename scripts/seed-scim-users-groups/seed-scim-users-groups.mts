import * as faker from '@faker-js/faker';
import { Logger } from '@graphql-hive/logger';
import { createPostgresDatabasePool, psql, type PostgresDatabasePool } from '@hive/postgres';
import { ensureEnv } from '../../integration-tests/testkit/env';

const logger = new Logger();

const organizationId = ensureEnv('HIVE_ORGANIZATION_ID');
const organizationAccessToken = ensureEnv('HIVE_ORGANIZATION_ACCESS_TOKEN');
const endpoint = 'http://localhost:3001/scim/v2';
const domain = 'hive.localhost';
const userCount = 100;
const groupCount = 10;
const maxGroupsPerUser = 5;

const usersEndpoint = endpoint + '/Users';
const groupsEndpoint = endpoint + '/Groups';

type ScimUser = {
  id: string;
  userName: string;
};

type ScimGroup = {
  id: string;
  displayName: string;
};

async function postScimResource<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${organizationAccessToken}`,
      'Content-Type': 'application/scim+json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`POST ${url} failed with ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

async function seedUsersAndGroups() {
  const seedId = crypto.randomUUID();
  const createdUsers: ScimUser[] = [];

  for (let index = 0; index < userCount; index++) {
    const email =
      `${faker.faker.person.firstName()}.${faker.faker.person.lastName()}@${domain}`.toLocaleLowerCase();
    const user = await postScimResource<ScimUser>(usersEndpoint, {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: email,
      emails: [{ primary: true, type: 'work', value: email }],
      externalId: crypto.randomUUID(),
      active: index % 10 !== 0,
    });
    createdUsers.push(user);
  }

  const membersByGroup = Array.from({ length: groupCount }, () => [] as Array<{ value: string }>);
  const membershipLimit = Math.min(maxGroupsPerUser, groupCount);
  createdUsers.forEach((user, userIndex) => {
    const membershipCount = userIndex % (membershipLimit + 1);
    for (let offset = 0; offset < membershipCount; offset++) {
      membersByGroup[(userIndex + offset) % groupCount].push({ value: user.id });
    }
  });

  const createdGroups: ScimGroup[] = [];
  for (let index = 0; index < groupCount; index++) {
    const group = await postScimResource<ScimGroup>(groupsEndpoint, {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      displayName: faker.faker.commerce.productName(),
      externalId: crypto.randomUUID(),
      members: membersByGroup[index],
    });
    createdGroups.push(group);
  }

  return { users: createdUsers, groups: createdGroups };
}

function getPGConnectionString() {
  const pg = {
    user: ensureEnv('POSTGRES_USER'),
    password: ensureEnv('POSTGRES_PASSWORD'),
    host: ensureEnv('POSTGRES_HOST'),
    port: ensureEnv('POSTGRES_PORT'),
    db: ensureEnv('POSTGRES_DB'),
  };

  return `postgres://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.db}?sslmode=disable`;
}

async function registerDomain(pool: PostgresDatabasePool, domain: string) {
  await pool.query(psql`
    INSERT INTO "oidc_integration_domains" (
      "organization_id"
      , "oidc_integration_id"
      , "domain_name"
      , "verified_at"
    )
    VALUES (
      ${organizationId}
      , (SELECT "id" FROM "oidc_integrations" WHERE "linked_organization_id" = ${organizationId})
      , ${domain}
      , NOW()
    )
    ON CONFLICT ("oidc_integration_id", "domain_name") DO UPDATE
      SET "verified_at" = NOW()
  `);
}

const pool = await createPostgresDatabasePool({
  connectionParameters: getPGConnectionString(),
});

try {
  logger.info({ domain, organizationId }, 'Attempt to register domain "%s" for organization "%s".');
  await registerDomain(pool, domain);
} finally {
  await pool.end();
}

logger.info({ userCount, groupCount }, 'Attempt to seed SCIM users and groups.');
const seeded = await seedUsersAndGroups();
logger.info(
  { users: seeded.users.length, groups: seeded.groups.length },
  'SCIM users and groups seeded.',
);
