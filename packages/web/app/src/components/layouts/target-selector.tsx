import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Link, useRouter } from '@tanstack/react-router';

const TargetSelector_OrganizationConnectionFragment = graphql(`
  fragment TargetSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      name
      cleanId
      projects {
        nodes {
          id
          name
          cleanId
          targets {
            nodes {
              id
              name
              cleanId
            }
          }
        }
      }
    }
  }
`);

export function TargetSelector(props: {
  currentOrganizationCleanId: string;
  currentProjectCleanId: string;
  currentTargetCleanId: string;
  organizations: FragmentType<typeof TargetSelector_OrganizationConnectionFragment> | null;
}) {
  const router = useRouter();

  const organizations = useFragment(
    TargetSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrganization = organizations?.find(
    node => node.cleanId === props.currentOrganizationCleanId,
  );

  const projects = currentOrganization?.projects.nodes;
  const currentProject = projects?.find(node => node.cleanId === props.currentProjectCleanId);

  const targets = currentProject?.targets.nodes;
  const currentTarget = targets?.find(node => node.cleanId === props.currentTargetCleanId);

  console.log({
    organizations,
    props,
    currentOrganization,
    currentProject,
    currentTarget,
  });

  return (
    <>
      {currentOrganization ? (
        <Link
          to="/$organizationId"
          params={{
            organizationId: currentOrganization.cleanId,
          }}
          className="max-w-[200px] shrink-0 truncate font-medium"
        >
          {currentOrganization.name}
        </Link>
      ) : (
        <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
      )}
      <div className="italic text-gray-500">/</div>
      {currentOrganization && currentProject ? (
        <Link
          to="/$organizationId/$projectId"
          params={{
            organizationId: props.currentOrganizationCleanId,
            projectId: props.currentProjectCleanId,
          }}
          className="max-w-[200px] shrink-0 truncate font-medium"
        >
          {currentProject.name}
        </Link>
      ) : (
        <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
      )}
      <div className="italic text-gray-500">/</div>
      {targets?.length && currentOrganization && currentProject && currentTarget ? (
        <>
          <Select
            value={props.currentTargetCleanId}
            onValueChange={id => {
              void router.navigate({
                to: '/$organizationId/$projectId/$targetId',
                params: {
                  organizationId: props.currentOrganizationCleanId,
                  projectId: props.currentProjectCleanId,
                  targetId: id,
                },
              });
            }}
          >
            <SelectTrigger variant="default">
              <div className="font-medium">{currentTarget.name}</div>
            </SelectTrigger>
            <SelectContent>
              {targets.map(target => (
                <SelectItem key={target.cleanId} value={target.cleanId}>
                  {target.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : (
        <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
      )}
    </>
  );
}
