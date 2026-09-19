import { Select } from '@/components/base/floating/select/select';
import { PrimaryNavigationLink } from '@/components/navigation/primary-navigation-link';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';

const ProjectSelector_OrganizationConnectionFragment = graphql(`
  fragment ProjectSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
      projects {
        edges {
          node {
            id
            slug
          }
        }
      }
    }
  }
`);

export function ProjectSelector(props: {
  currentOrganizationSlug: string;
  currentProjectSlug: string;
  organizations: FragmentType<typeof ProjectSelector_OrganizationConnectionFragment> | null;
}) {
  const router = useRouter();

  const organizations = useFragment(
    ProjectSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrganization = organizations?.find(
    node => node.slug === props.currentOrganizationSlug,
  );

  const projectEdges = currentOrganization?.projects.edges;
  const currentProject = projectEdges?.find(
    edge => edge.node.slug === props.currentProjectSlug,
  )?.node;

  return (
    <>
      {currentOrganization ? (
        <PrimaryNavigationLink
          linkProps={{
            to: '/$organizationSlug',
            params: { organizationSlug: props.currentOrganizationSlug },
          }}
          linkText={currentOrganization.slug}
        />
      ) : (
        <div className="bg-neutral-5 h-5 w-48 max-w-[200px] animate-pulse rounded-full" />
      )}
      {projectEdges?.length && currentProject ? (
        <>
          <div className="text-neutral-10 italic">/</div>
          <Select
            options={projectEdges.map(edge => ({ value: edge.node.slug, label: edge.node.slug }))}
            value={props.currentProjectSlug}
            onValueChange={id => {
              void router.navigate({
                to: '/$organizationSlug/$projectSlug',
                params: {
                  organizationSlug: props.currentOrganizationSlug,
                  projectSlug: id,
                },
              });
            }}
            data-cy="project-picker-trigger"
          />
        </>
      ) : (
        <div className="bg-neutral-5 h-5 w-48 animate-pulse rounded-full" />
      )}
    </>
  );
}
