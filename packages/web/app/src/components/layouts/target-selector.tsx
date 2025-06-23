import { FragmentType, graphql, useFragment } from '@/gql';
import { Link } from '../ui/link';

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
  optional?: boolean;
  showOrganization?: boolean;
  showProject?: boolean;
  onValueChange?: (value: string) => void;
  organizations: FragmentType<typeof TargetSelector_OrganizationConnectionFragment> | null;
}) {
  const showOrganization =
    typeof props.showOrganization !== 'undefined' ? props.showOrganization : true;
  const showProject = typeof props.showProject !== 'undefined' ? props.showProject : true;

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

  return (
    <>
      {showOrganization ? (
        currentOrganization ? (
          <Link
            to="/$organizationSlug"
            params={{
              organizationSlug: currentOrganization.slug,
            }}
            className="max-w-[200px] shrink-0 truncate font-medium"
          >
            {currentOrganization.slug}
          </Link>
        ) : (
          <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
        )
      ) : (
        <></>
      )}
      {showOrganization ? <div className="italic text-gray-500">/</div> : <></>}
      {showProject ? (
        currentOrganization && currentProject ? (
          <Link
            to="/$organizationSlug/$projectSlug"
            params={{
              organizationSlug: props.currentOrganizationSlug,
              projectSlug: props.currentProjectSlug,
            }}
            className="max-w-[200px] shrink-0 truncate font-medium"
          >
            {currentProject.slug}
          </Link>
        ) : (
          <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
        )
      ) : (
        <></>
      )}
      <div className="italic text-gray-500">/</div>
      {targetEdges?.length ? (
        <TargetSelectorDropdown />
      ) : (
        <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
      )}
    </>
  );
}
