import { addDays, formatISO, subDays } from 'date-fns';
import { readOperationsStats, readTotalRequests } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { ProjectType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';
import { UTCDate } from '@date-fns/utc';

const ExplorerUsageQuery = graphql(/* GraphQL */ `
  query IntegrationTestsExplorerUsage(
    $targetRef: TargetReferenceInput!
    $usage: SchemaExplorerUsageInput
  ) {
    latestValidVersion(target: $targetRef) {
      explorer(usage: $usage) {
        types {
          __typename
          ... on GraphQLObjectType {
            name
            fields {
              name
              usage {
                isUsed
              }
            }
          }
        }
      }
      unusedSchema {
        types {
          __typename
        }
      }
      deprecatedSchema {
        types {
          __typename
        }
      }
    }
  }
`);

const RETENTION_ERROR = {
  message: expect.stringContaining('retention'),
  extensions: expect.objectContaining({ code: 'PERIOD_OUTSIDE_RETENTION' }),
};

function daysAgo(days: number) {
  return formatISO(subDays(new UTCDate(), days));
}

// A UTC midnight, exactly where the boundary sits.
function startOfDayAgo(days: number) {
  const day = new UTCDate(subDays(new UTCDate(), days));
  day.setUTCHours(0, 0, 0, 0);
  return formatISO(day);
}

test.concurrent(
  'a Hobby organization cannot read past its 7 days and the day of grace',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target } = await createProject(ProjectType.Single);
    const period = { from: daysAgo(9), to: formatISO(new UTCDate()) };

    const stats = await readOperationsStats({ byId: target.id }, period, {}, ownerToken);
    const errors = stats.expectGraphQLErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      ...RETENTION_ERROR,
      extensions: expect.objectContaining({ retentionInDays: 7 }),
      path: ['target', 'operationsStats'],
    });
    expect(stats.rawBody.data?.target).toBeNull();

    const total = await readTotalRequests({ byId: target.id }, period, ownerToken);
    expect(total.expectGraphQLErrors()[0]).toMatchObject({
      ...RETENTION_ERROR,
      path: ['target', 'totalRequests'],
    });
  },
);

test.concurrent('the boundary day is inside the retention', async ({ expect }) => {
  const { createOrg } = await initSeed().createOwner();
  const { createProject } = await createOrg();
  const { readOperationsStats: read } = await createProject(ProjectType.Single);
  const now = formatISO(new UTCDate());

  await read(startOfDayAgo(7), now);
  // One day of grace, for a start the console resolved before midnight.
  await read(daysAgo(8), now);
  // The console rounds the start of "last 7 days" down to the hour, and may ask up to a day ahead.
  await read(daysAgo(7), formatISO(addDays(new UTCDate(), 1)));
});

test.concurrent('the check follows a changed retention', async ({ expect }) => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setDataRetention } = await createOrg();
  const { target, readOperationsStats: read } = await createProject(ProjectType.Single);

  await setDataRetention(30);
  await read(daysAgo(9), formatISO(new UTCDate()));

  const stats = await readOperationsStats(
    { byId: target.id },
    { from: daysAgo(32), to: formatISO(new UTCDate()) },
    {},
    ownerToken,
  );
  expect(stats.expectGraphQLErrors()[0]).toMatchObject({
    ...RETENTION_ERROR,
    extensions: expect.objectContaining({ retentionInDays: 30 }),
  });
});

test.concurrent(
  'the explorer defaults to what the plan keeps; a period past it fails once at the explorer, not per field',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Single);
    const token = await createTargetAccessToken({});
    await token
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            user: User
          }

          type User {
            id: ID!
            name: String @deprecated(reason: "use id")
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());

    const byDefault = await execute({
      document: ExplorerUsageQuery,
      variables: { targetRef: { byId: target.id }, usage: null },
      authToken: token.secret,
    }).then(r => r.expectNoGraphQLErrors());
    expect(byDefault.latestValidVersion?.explorer?.types.length).toBeGreaterThan(0);
    expect(byDefault.latestValidVersion?.unusedSchema?.types.length).toBeGreaterThan(0);
    expect(byDefault.latestValidVersion?.deprecatedSchema?.types.length).toBeGreaterThan(0);

    const pastRetention = await execute({
      document: ExplorerUsageQuery,
      variables: {
        targetRef: { byId: target.id },
        usage: { period: { from: daysAgo(9), to: formatISO(new UTCDate()) } },
      },
      authToken: token.secret,
    });
    const errors = pastRetention.expectGraphQLErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({
      ...RETENTION_ERROR,
      path: ['latestValidVersion', 'explorer'],
    });
    expect(pastRetention.rawBody.data?.latestValidVersion?.explorer).toBeNull();
    expect(pastRetention.rawBody.data?.latestValidVersion?.unusedSchema).not.toBeNull();
  },
);
