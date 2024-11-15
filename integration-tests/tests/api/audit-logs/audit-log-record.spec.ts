import { waitFor } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { ProjectType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';

test.concurrent('Create multiple Audit Log Records for Organization', async ({ expect }) => {
  const query = graphql(`
    query GetAllAuditLogsArray($selector: OrganizationSelectorInput!) {
      organization(selector: $selector) {
        organization {
          id
          slug
          auditLogs {
            edges {
              node {
                __typename
              }
            }
          }
        }
      }
    }
  `);

  const { ownerToken, createOrg } = await initSeed().createOwner();
  const { organization, createProject } = await createOrg();
  await waitFor(5000);
  await createProject(ProjectType.Single);
  await waitFor(4000);

  const result = await execute({
    document: query,
    variables: {
      selector: {
        organizationSlug: organization.slug,
      },
    },
    authToken: ownerToken,
  });

  const auditLogs = result.rawBody.data?.organization?.organization.auditLogs.edges;

  expect(auditLogs?.length).toBe(3);
  expect(auditLogs?.length).not.toBe(0);
  expect(auditLogs?.[0].node.__typename).toBe('TargetCreatedAuditLog');
  expect(auditLogs?.[1].node.__typename).toBe('ProjectCreatedAuditLog');
  expect(auditLogs?.[2].node.__typename).toBe('OrganizationCreatedAuditLog');
});

test.concurrent('Create Audit Log Record for Organization', async ({ expect }) => {
  const query = graphql(`
    query GetAllAuditLogs($selector: OrganizationSelectorInput!) {
      organization(selector: $selector) {
        organization {
          id
          slug
          auditLogs {
            edges {
              node {
                ... on OrganizationCreatedAuditLog {
                  id
                  eventTime
                  organizationSlug
                  organizationId
                  __typename
                  record {
                    organizationId
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  const { ownerToken, createOrg } = await initSeed().createOwner();
  const { organization } = await createOrg();

  const result = await execute({
    document: query,
    variables: {
      selector: {
        organizationSlug: organization.slug,
      },
    },
    authToken: ownerToken,
  });
  const auditLogs = result.rawBody.data?.organization?.organization.auditLogs.edges;

  waitFor(4000);

  expect(auditLogs?.length).toBe(1);
  expect(auditLogs?.length).not.toBe(0);
  expect(auditLogs?.[0].node.__typename).toBe('OrganizationCreatedAuditLog');
  if (auditLogs?.[0].node.__typename === 'OrganizationCreatedAuditLog') {
    expect(auditLogs?.[0].node.record.organizationId).toBe(organization.id);
    expect(auditLogs?.[0].node.organizationId).toBe(organization.id);
  }
});

const ExportAllAuditLogs = graphql(`
  mutation exportAllAuditLogs($selector: OrganizationSelectorInput!, $filter: AuditLogFilter) {
    exportOrganizationAuditLog(selector: $selector, filter: $filter) {
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

test.concurrent(
  'Try to export Audit Logs from an Organization with unauthorized user',
  async () => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const firstOrg = await createOrg();
    const secondOrg = await initSeed().createOwner();
    const secondToken = secondOrg.ownerToken;

    const exportAuditLogs = await execute({
      document: ExportAllAuditLogs,
      variables: {
        selector: {
          organizationSlug: firstOrg.organization.id,
        },
        filter: {
          startDate: '1960-12-31T22:00:00.000Z',
          endDate: '2023-12-31T22:00:00.000Z',
        },
      },
      token: secondToken,
    });

    expect(exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.ok).toBeNull();
    expect(exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.error).toBeDefined();
    expect(exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.error?.message).toBe(
      'Unauthorized: You are not authorized to perform this action',
    );
  },
);

test.concurrent('Try to export Audit Logs from an Organization with authorized user', async () => {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const firstOrg = await createOrg();
  await waitFor(5000);

  const exportAuditLogs = await execute({
    document: ExportAllAuditLogs,
    variables: {
      selector: {
        organizationSlug: firstOrg.organization.id,
      },
      filter: {
        startDate: '1960-12-31T22:00:00.000Z',
        endDate: '2023-12-31T22:00:00.000Z',
      },
    },
    token: ownerToken,
  });

  expect(exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.ok).toBeDefined();
  expect(exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.error).toBeNull();
  expect(exportAuditLogs.rawBody.data?.exportOrganizationAuditLog.ok?.url).toBeDefined();
});
