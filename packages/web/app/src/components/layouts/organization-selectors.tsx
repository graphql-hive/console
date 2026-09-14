import { Select } from '@/components/base/floating/select/select';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';

const OrganizationSelector_OrganizationConnectionFragment = graphql(`
  fragment OrganizationSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
    }
  }
`);

export function OrganizationSelector(props: {
  currentOrganizationSlug: string;
  organizations: FragmentType<typeof OrganizationSelector_OrganizationConnectionFragment> | null;
}) {
  const router = useRouter();
  const organizations = useFragment(
    OrganizationSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  if (!organizations) {
    return <div className="bg-neutral-5 h-5 w-48 animate-pulse rounded-full" />;
  }

  return (
    <Select
      options={organizations.map(org => ({ value: org.slug, label: org.slug }))}
      value={props.currentOrganizationSlug}
      onValueChange={slug => {
        void router.navigate({
          to: '/$organizationSlug',
          params: {
            organizationSlug: slug,
          },
        });
      }}
      data-cy="organization-picker-trigger"
    />
  );
}
