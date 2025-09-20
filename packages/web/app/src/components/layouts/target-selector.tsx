import { FragmentType, graphql, useFragment } from '@/gql';
import { useRouter } from '@tanstack/react-router';
import { Link } from '../ui/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
  onValueChange?: ((value: string) => void) | undefined;
  organizations: FragmentType<typeof TargetSelector_OrganizationConnectionFragment> | null;
}) {
  const router = useRouter();

  const showOrganization =
    typeof props.showOrganization !== 'undefined' ? props.showOrganization : true;
  const showProject = typeof props.showProject !== 'undefined' ? props.showProject : true;
  const isOptional = typeof props.optional !== 'undefined' ? props.optional : false;
  const defaultOnValueChange = (id: string) => {
    void router.navigate({
      to: '/$organizationSlug/$projectSlug/$targetSlug',
      params: {
        organizationSlug: props.currentOrganizationSlug,
        projectSlug: props.currentProjectSlug,
        targetSlug: id,
      },
    });
  };
  const onValueChangeFunc =
    typeof props.onValueChange !== 'undefined' ? props.onValueChange : defaultOnValueChange;

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
      ) : null}
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
      ) : null}
      {showProject ? <div className="italic text-gray-500">/</div> : null}
      {(targetEdges?.length && currentOrganization && currentProject && currentTarget) ||
      isOptional ? (
        <>
          <Select value={props.currentTargetSlug} onValueChange={onValueChangeFunc}>
            <SelectTrigger variant="default" data-cy="target-picker-trigger">
              <div className="font-medium" data-cy="target-picker-current">
                {isOptional ? (
                  <SelectValue placeholder="Pick an option" />
                ) : (
                  (currentTarget?.slug ?? '')
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {isOptional ? (
                <SelectItem key="empty" value="empty" data-cy="project-picker-option-Unassigned">
                  Unassigned
                </SelectItem>
              ) : (
                <></>
              )}
              {targetEdges ? (
                targetEdges.map(edge => (
                  <SelectItem
                    key={edge.node.slug}
                    value={edge.node.slug}
                    data-cy={`target-picker-option-${edge.node.slug}`}
                  >
                    {edge.node.slug}
                  </SelectItem>
                ))
              ) : (
                <></>
              )}
            </SelectContent>
          </Select>
        </>
      ) : (
        <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
      )}
    </>
  );
}
