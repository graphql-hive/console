import { graphql } from '@/gql';

// No variables: fetched once per session, a cache hit everywhere after.
export const ViewerQuery = graphql(`
  query ViewerQuery {
    me {
      id
      ...UserMenu_MeFragment
    }
    organizations {
      ...OrganizationSelector_OrganizationConnectionFragment
      ...ProjectSelector_OrganizationConnectionFragment
      ...TargetSelector_OrganizationConnectionFragment
      ...UserMenu_OrganizationConnectionFragment
    }
    isCDNEnabled
  }
`);

export const OrganizationLayoutQuery = graphql(`
  query OrganizationLayoutQuery($organizationSlug: String!, $minimal: Boolean!) {
    organizationBySlug(organizationSlug: $organizationSlug) @skip(if: $minimal) {
      id
      slug
      viewerCanCreateProject
      viewerCanManageSupportTickets
      viewerCanDescribeBilling
      viewerCanSeeMembers
      viewerCanAccessSettings
      viewerCanManageAccessTokens
      viewerCanManagePersonalAccessTokens
      ...UserMenu_OrganizationFragment
      ...ProPlanBilling_OrganizationFragment
      ...RateLimitWarn_OrganizationFragment
    }
  }
`);

export const ProjectLayoutQuery = graphql(`
  query ProjectLayoutQuery($organizationSlug: String!, $projectSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        viewerCanModifySchemaPolicy
        viewerCanCreateTarget
        viewerCanModifyAlerts
        viewerCanModifySettings
        viewerCanManageProjectAccessTokens
        ...LegacyCompositionWarn_ProjectFragment
      }
      ...UserMenu_OrganizationFragment
    }
  }
`);

export const TargetLayoutQuery = graphql(`
  query TargetLayoutQuery($organizationSlug: String!, $projectSlug: String!, $targetSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        target: targetBySlug(targetSlug: $targetSlug) {
          id
          slug
          viewerCanViewLaboratory
          viewerCanViewAppDeployments
          viewerCanAccessSettings
          viewerCanAccessTraces
          viewerCanViewSchemaProposals
          viewerCanUseMetricAlertRules
          # Warms the cache for the /history index redirect (routes/target/history.tsx).
          latestSchemaVersion {
            id
          }
        }
      }
      ...UserMenu_OrganizationFragment
    }
  }
`);
