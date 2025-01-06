import { endOfDay, startOfDay } from 'date-fns';
import { graphql } from 'testkit/gql';
import { ProjectType, RuleInstanceSeverityLevel } from 'testkit/gql/graphql';
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
    await createProject(ProjectType.Single);
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
  await createProject(ProjectType.Single);

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
  expect(exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.error).toBeNull();
  const url = exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.ok?.url;
  const parsedUrl = new URL(String(url));
  const pathParts = parsedUrl.pathname.split('/');
  const bucketName = pathParts[1];
  const key = pathParts.slice(2).join('/');
  const getObjectCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  const result = await s3Client.send(getObjectCommand);
  const bodyStream = await result.Body?.transformToString();
  expect(bodyStream).toBeDefined();

  const rows = bodyStream?.split('\n');
  expect(rows?.length).toBeGreaterThan(1); // At least header and one row
  const header = rows?.[0].split(',');
  const expectedHeader = ['id', 'created_at', 'event_type', 'user_id', 'user_email', 'metadata'];
  expect(header).toEqual(expectedHeader);
  // Sometimes the order of the rows is not guaranteed, so we need to check if the expected rows are present
  expect(rows?.find(row => row.includes('ORGANIZATION_CREATED'))).toBeDefined();
  expect(rows?.find(row => row.includes('PROJECT_CREATED'))).toBeDefined();
  expect(rows?.find(row => row.includes('TARGET_CREATED'))).toBeDefined();
});

test.concurrent('export audit log for schema policy', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, setOrganizationSchemaPolicy, organization } = await createOrg();
  await createProject(ProjectType.Single);
  await setOrganizationSchemaPolicy(
    {
      rules: [
        {
          configuration: { definitions: false },
          ruleId: 'alphabetize',
          severity: RuleInstanceSeverityLevel.Warning,
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
