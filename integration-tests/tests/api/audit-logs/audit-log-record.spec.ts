import * as sp from 'node:stream/promises';
import * as csvp from 'csv-parse';
import { endOfDay, startOfDay } from 'date-fns';
import { pollFor } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import * as GraphQLSchema from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: 'http://127.0.0.1:9000',
  region: 'auto',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
});

/** Utility function for getting the s3 report without hazzle */
async function fetchAuditLogFromS3Bucket(url: string): Promise<string> {
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split('/');
  const bucketName = pathParts[1];
  const key = pathParts.slice(2).join('/');
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const result = await s3Client.send(getObjectCommand);
  const body = await result.Body?.transformToString();
  if (!body) {
    throw new Error('Body is empty lol.');
  }
  return body;
}

/** Parse the audit log into a json object */
async function parseAuditLog(contents: string): Promise<Array<any>> {
  const parser = csvp.parse();
  parser.write(contents);
  parser.end();

  const d: any = [];

  let headerMapping: Array<[string, number]> | null = null;

  parser.on('data', (chunk: Array<string>) => {
    if (!headerMapping) {
      headerMapping = chunk.map((key, index) => [key, index] as const);
    } else {
      d.push(
        Object.fromEntries(
          headerMapping.map(([key, index]) => [
            key,
            key === 'metadata' ? JSON.parse(chunk[index]) : chunk[index],
          ]),
        ),
      );
    }
  });
  await sp.finished(parser);
  return d;
}

const ExportAllAuditLogs = graphql(`
  mutation exportAllAuditLogs($input: ExportOrganizationAuditLogInput!) {
    exportOrganizationAuditLog(input: $input) {
      ok {
        url
      }
      error {
        message
      }
      __typename
    }
  }
`);

const today = endOfDay(new Date());
const lastYear = startOfDay(new Date(new Date().setFullYear(new Date().getFullYear() - 1)));

test.concurrent(
  'Try to export Audit Logs from an Organization with unauthorized user - should throw error',
  async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject, organization } = await createOrg();
    await createProject(GraphQLSchema.ProjectType.Single);
    const secondOrg = await initSeed().createOwner();
    const secondToken = secondOrg.ownerToken;

    await execute({
      document: ExportAllAuditLogs,
      variables: {
        input: {
          selector: {
            organizationSlug: organization.slug,
          },
          filter: {
            startDate: lastYear.toISOString(),
            endDate: today.toISOString(),
          },
        },
      },
      token: secondToken,
    }).then(r => r.expectGraphQLErrors());
  },
);

test.concurrent('Try to export Audit Logs from an Organization with authorized user', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, organization } = await createOrg();
  await createProject(GraphQLSchema.ProjectType.Single);

  const expectedHeader = [
    'id',
    'created_at',
    'event_type',
    'user_id',
    'user_email',
    'access_token_id',
    'metadata',
  ];

  // Poll until all expected audit log entries are visible in ClickHouse
  // ClickHouse has eventual consistency, so data may not be immediately visible after INSERT
  await pollFor(async () => {
    const exportAuditLogs = await execute({
      document: ExportAllAuditLogs,
      variables: {
        input: {
          selector: {
            organizationSlug: organization.slug,
          },
          filter: {
            startDate: lastYear.toISOString(),
            endDate: today.toISOString(),
          },
        },
      },
      token: ownerToken,
    });

    const apiError = exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.error;
    if (apiError) {
      throw new Error(`Export audit logs API error: ${apiError.message}`);
    }

    const url = exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.ok?.url;
    if (!url) {
      return false; // Data not ready yet, continue polling
    }

    const bodyStream = await fetchAuditLogFromS3Bucket(url);
    const rows = bodyStream.split('\n');

    if (rows.length <= 1) {
      return false;
    }

    const header = rows[0].split(',');
    if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
      return false;
    }

    // Check if all expected audit log entries are present
    const hasOrgCreated = rows.some(row => row.includes('ORGANIZATION_CREATED'));
    const hasProjectCreated = rows.some(row => row.includes('PROJECT_CREATED'));
    const hasTargetCreated = rows.some(row => row.includes('TARGET_CREATED'));

    return hasOrgCreated && hasProjectCreated && hasTargetCreated;
  });
});

test.concurrent('export audit log for schema policy', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setOrganizationSchemaPolicy, organization } = await createOrg();
  await createProject(GraphQLSchema.ProjectType.Single);
  await setOrganizationSchemaPolicy(
    {
      rules: [
        {
          configuration: { definitions: false },
          ruleId: 'alphabetize',
          severity: GraphQLSchema.RuleInstanceSeverityLevel.Warning,
        },
      ],
    },
    true,
  );

  await execute({
    document: ExportAllAuditLogs,
    variables: {
      input: {
        selector: {
          organizationSlug: organization.slug,
        },
        filter: {
          startDate: lastYear.toISOString(),
          endDate: today.toISOString(),
        },
      },
    },
    token: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());
});

test.concurrent('access token actions are stored within the audit log', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { organization, createOrganizationAccessToken } = await createOrg();
  // First we create an access token with the organization owner token
  const accessToken = await createOrganizationAccessToken({
    permissions: ['organization:describe', 'project:describe', 'accessToken:modify'],
    resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
  });

  // Now we create a new one using the access token
  await createOrganizationAccessToken(
    {
      permissions: ['organization:describe', 'project:describe'],
      resources: { mode: GraphQLSchema.ResourceAssignmentModeType.All },
    },
    accessToken.privateAccessKey,
  );

  const exportAuditLogs = await execute({
    document: ExportAllAuditLogs,
    variables: {
      input: {
        selector: {
          organizationSlug: organization.slug,
        },
        filter: {
          startDate: lastYear.toISOString(),
          endDate: today.toISOString(),
        },
      },
    },
    token: ownerToken,
  }).then(res => res.expectNoGraphQLErrors());

  const url = exportAuditLogs?.exportOrganizationAuditLog.ok?.url;
  const contents = await fetchAuditLogFromS3Bucket(String(url));
  const logs = await parseAuditLog(contents);
  /** Find the log entry of the access token we used */
  const logEntries = logs.filter(
    log => log.access_token_id === accessToken.createdOrganizationAccessToken.id,
  );

  expect(logEntries.length).toEqual(1);
  const [logEntry] = logEntries;
  expect(logEntry.event_type).toEqual('ORGANIZATION_ACCESS_TOKEN_CREATED');
  expect(
    accessToken.privateAccessKey.startsWith(logEntry.metadata.accessToken.firstCharacters),
  ).toEqual(true);
});
