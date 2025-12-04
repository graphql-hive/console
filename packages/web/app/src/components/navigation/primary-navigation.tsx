import { HierarchicalSelector } from '@/components/navigation/hierarchical-selector';
import { HiveLink } from '@/components/ui/hive-link';
import { UserMenu } from '@/components/ui/user-menu';
import { FragmentType, graphql, useFragment } from '@/gql';
import { AuthProviderType } from '@/gql/graphql';
import { useParams } from '@tanstack/react-router';

export const PrimaryNavigation_MeFragment = graphql(`
  fragment PrimaryNavigation_MeFragment on User {
    id
    provider
    ...UserMenu_MeFragment
  }
`);

export const PrimaryNavigation_OrganizationConnectionFragment = graphql(`
  fragment PrimaryNavigation_OrganizationConnectionFragment on OrganizationConnection {
    ...HierarchicalSelector_OrganizationConnectionFragment
    ...UserMenu_OrganizationConnectionFragment
  }
`);

interface PrimaryNavigationProps {
  me: FragmentType<typeof PrimaryNavigation_MeFragment> | null;
  organizations: FragmentType<typeof PrimaryNavigation_OrganizationConnectionFragment> | null;
}

export const PrimaryNavigation = (props: PrimaryNavigationProps) => {
  const { organizationSlug, projectSlug, targetSlug } = useParams({ strict: false });

  const me = useFragment(PrimaryNavigation_MeFragment, props.me);
  const organizations = useFragment(
    PrimaryNavigation_OrganizationConnectionFragment,
    props.organizations,
  );

  return (
    <header>
      <div className="container flex h-[--header-height] items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          <HiveLink className="size-8" />
          {organizationSlug && (
            <HierarchicalSelector
              isOIDCUser={me?.provider === AuthProviderType.Oidc}
              currentOrganizationSlug={organizationSlug}
              currentProjectSlug={projectSlug}
              currentTargetSlug={targetSlug}
              organizations={organizations}
            />
          )}
        </div>
        {organizationSlug && (
          <div>
            <UserMenu
              me={me ?? null}
              currentOrganizationSlug={organizationSlug}
              organizations={organizations}
            />
          </div>
        )}
      </div>
    </header>
  );
};
