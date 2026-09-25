/**
 * Result data for the viewer, layout and user-menu queries, shaped exactly as their documents
 * select (see the flattened documents in `src/gql/persisted-documents.json`), for a viewer with
 * every permission. The slugs match the URLs `render.spec.tsx` visits.
 */

export const SLUGS = {
  organizationSlug: 'the-guild',
  projectSlug: 'gateway',
  targetSlug: 'production',
} as const;

const me = {
  __typename: 'User' as const,
  id: 'user-1',
  email: 'user@the-guild.dev',
  displayName: 'User',
  provider: 'GITHUB',
  isAdmin: false,
  canSwitchOrganization: true,
  provisionInfo: null,
};

const getStarted = {
  __typename: 'OrganizationGetStarted' as const,
  checkingSchema: true,
  creatingProject: true,
  enablingUsageBasedBreakingChanges: true,
  invitingMembers: true,
  publishingSchema: true,
  reportingOperations: true,
};

const organizationMember = {
  __typename: 'Member' as const,
  id: 'member-1',
  canLeaveOrganization: false,
};

const target = {
  __typename: 'Target' as const,
  id: 'target-1',
  slug: SLUGS.targetSlug,
  latestSchemaVersion: { __typename: 'SchemaVersion' as const, id: 'version-42' },
  viewerCanAccessSettings: true,
  viewerCanAccessTraces: true,
  viewerCanUseMetricAlertRules: true,
  viewerCanViewAppDeployments: true,
  viewerCanViewLaboratory: true,
  viewerCanViewSchemaProposals: true,
};

const project = {
  __typename: 'Project' as const,
  id: 'project-1',
  slug: SLUGS.projectSlug,
  type: 'FEDERATION',
  isNativeFederationEnabled: true,
  externalSchemaComposition: null,
  viewerCanCreateTarget: true,
  viewerCanManageProjectAccessTokens: true,
  viewerCanModifyAlerts: true,
  viewerCanModifySchemaPolicy: true,
  viewerCanModifySettings: true,
};

/** `organizations`: one organization with one project with one target, as every selector reads it. */
const organizations = {
  __typename: 'OrganizationConnection' as const,
  nodes: [
    {
      __typename: 'Organization' as const,
      id: 'organization-1',
      slug: SLUGS.organizationSlug,
      projects: {
        __typename: 'ProjectConnection' as const,
        edges: [
          {
            __typename: 'ProjectEdge' as const,
            node: {
              __typename: 'Project' as const,
              id: project.id,
              slug: project.slug,
              targets: {
                __typename: 'TargetConnection' as const,
                edges: [
                  {
                    __typename: 'TargetEdge' as const,
                    node: { __typename: 'Target' as const, id: target.id, slug: target.slug },
                  },
                ],
              },
            },
          },
        ],
      },
    },
  ],
};

const organization = {
  __typename: 'Organization' as const,
  id: 'organization-1',
  slug: SLUGS.organizationSlug,
  me: organizationMember,
  getStarted,
  billingConfiguration: { __typename: 'BillingConfiguration' as const, hasPaymentIssues: false },
  plan: 'HOBBY',
  isMonthlyOperationsLimitExceeded: false,
  viewerCanAccessSettings: true,
  viewerCanCreateProject: true,
  viewerCanDescribeBilling: true,
  viewerCanManageAccessTokens: true,
  viewerCanManagePersonalAccessTokens: true,
  viewerCanManageSupportTickets: true,
  viewerCanSeeMembers: true,
};

export function viewer() {
  return { __typename: 'Query' as const, me, organizations, isCDNEnabled: true };
}

export function userMenuOrganization() {
  return { __typename: 'Query' as const, organizationBySlug: organization };
}

export function organizationLayout() {
  return { __typename: 'Query' as const, organizationBySlug: organization };
}

export function projectLayout() {
  return { __typename: 'Query' as const, organization: { ...organization, project } };
}

export function targetLayout() {
  return {
    __typename: 'Query' as const,
    organization: { ...organization, project: { ...project, target } },
  };
}

/** Every chrome query answered, for a spec that renders any page of the app. */
export function layoutFixtures() {
  return new Map<string, unknown>([
    ['ViewerQuery', viewer()],
    ['UserMenu_OrganizationQuery', userMenuOrganization()],
    ['OrganizationLayoutQuery', organizationLayout()],
    ['ProjectLayoutQuery', projectLayout()],
    ['TargetLayoutQuery', targetLayout()],
  ]);
}
