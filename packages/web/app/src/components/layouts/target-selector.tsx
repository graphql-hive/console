import { PrimaryNavigationLink } from '@/components/new/primary-navigation-link';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';

const TargetSelector_OrganizationConnectionFragment = graphql(`
  fragment TargetSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
      projects {
        edges {
          node {
            id
            slug
            targets {
              edges {
                node {
                  id
                  slug
                }
              }
            }
          }
        }
      }
    }
  }
`);

export function TargetSelector(props: {
  currentOrganizationSlug: string;
  currentProjectSlug: string;
  currentTargetSlug: string;
  organizations: FragmentType<typeof TargetSelector_OrganizationConnectionFragment> | null;
}) {
  const router = useRouter();

  const organizations = useFragment(
    TargetSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrganization = organizations?.find(
    node => node.slug === props.currentOrganizationSlug,
  );

  const projects = currentOrganization?.projects.edges;
  const currentProject = projects?.find(edge => edge.node.slug === props.currentProjectSlug)?.node;

  const targetEdges = currentProject?.targets.edges;
  const currentTarget = targetEdges?.find(edge => edge.node.slug === props.currentTargetSlug)?.node;

  return (
    <>
      {currentOrganization ? (
        <PrimaryNavigationLink
          linkProps={{
            to: '/$organizationSlug',
            params: { organizationSlug: currentOrganization.slug },
          }}
          linkText={currentOrganization.slug}
        />
      ) : (
        <div className="bg-neutral-5 h-5 w-48 max-w-[200px] animate-pulse rounded-full" />
      )}
      <div className="text-neutral-10 italic">/</div>
      {currentOrganization && currentProject ? (
        <PrimaryNavigationLink
          linkProps={{
            to: '/$organizationSlug/$projectSlug',
            params: {
              organizationSlug: props.currentOrganizationSlug,
              projectSlug: props.currentProjectSlug,
            },
          }}
          linkText={currentProject.slug}
        />
      ) : (
        <div className="bg-neutral-5 h-5 w-48 max-w-[200px] animate-pulse rounded-full" />
      )}
      <div className="text-neutral-10 italic">/</div>
      {targetEdges?.length && currentOrganization && currentProject && currentTarget ? (
        <>
          <Select
            value={props.currentTargetSlug}
            onValueChange={id => {
              void router.navigate({
                params: {
                  targetSlug: id,
                },
              });
            }}
          >
            <SelectTrigger variant="default" data-cy="target-picker-trigger">
              <div className="font-medium" data-cy="target-picker-current">
                {currentTarget.slug}
              </div>
            </SelectTrigger>
            <SelectContent>
              {targetEdges.map(edge => (
                <SelectItem
                  key={edge.node.slug}
                  value={edge.node.slug}
                  data-cy={`target-picker-option-${edge.node.slug}`}
                >
                  {edge.node.slug}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <div className="bg-neutral-5 h-5 w-48 max-w-[200px] animate-pulse rounded-full" />
      )}
    </>
  );
}
