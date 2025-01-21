import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Link, useRouter } from '@tanstack/react-router';

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
  isOIDCUser: boolean;
}) {
  const router = useRouter();
  const organizations = useFragment(
    OrganizationSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrganization = organizations?.find(
    node => node.slug === props.currentOrganizationSlug,
  );

  if (!organizations) {
    return <div className="h-5 w-48 animate-pulse rounded-full bg-gray-800" />;
  }

  if (props.isOIDCUser) {
    return (
      <Link
        to="/$organizationSlug"
        params={{ organizationSlug: props.currentOrganizationSlug }}
        className="max-w-[200px] shrink-0 truncate font-medium"
      >
        {props.currentOrganizationSlug}
      </Link>
    );
  }

  return (
    <Select
      value={props.currentOrganizationSlug}
      onValueChange={id => {
        void router.navigate({
          to: '/$organizationSlug',
          params: {
            organizationSlug: id,
          },
        });
      }}
    >
      <SelectTrigger variant="default" data-cy="organization-picker-trigger">
        <div className="font-medium" data-cy="organization-picker-current">
          {currentOrganization?.slug}
        </div>
      </SelectTrigger>
      <SelectContent>
        {organizations.map(org => (
          <SelectItem
            key={org.slug}
            value={org.slug}
            data-cy={`organization-picker-option-${org.slug}`}
          >
            {org.slug}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
