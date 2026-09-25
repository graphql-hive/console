import { Select } from '@/components/base/floating/select/select';
import { graphql, useFragment } from '@/gql';
import { useViewer } from '@/lib/hooks';
import { useRouter } from '@tanstack/react-router';

const OrganizationSelector_OrganizationConnectionFragment = graphql(`
  fragment OrganizationSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
    }
  }
`);

export function OrganizationSelector(props: { currentOrganizationSlug: string }) {
  const router = useRouter();
  const organizations = useFragment(
    OrganizationSelector_OrganizationConnectionFragment,
    useViewer().data?.organizations ?? null,
  )?.nodes;

  if (!organizations) {
    return <div className="bg-neutral-5 h-5 w-48 animate-pulse rounded-full" />;
  }

  return (
    <Select
      aria-label="Organization"
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
