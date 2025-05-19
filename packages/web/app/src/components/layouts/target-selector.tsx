import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FragmentType, graphql, useFragment } from '@/gql';
import { Link, useRouter } from '@tanstack/react-router';

const TargetSelector_OrganizationConnectionFragment = graphql(`
  fragment TargetSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
      projects {
        nodes {
          id
          slug
          targets {
            nodes {
              id
              slug
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
  onValueChange?: Function;
  organizations: FragmentType<typeof TargetSelector_OrganizationConnectionFragment> | null;
}) {
  const router = useRouter();

  const showOrganization =
    typeof props.showOrganization !== 'undefined' ? props.showOrganization : true;
  const showProject = typeof props.showProject !== 'undefined' ? props.showProject : true;
  const isOptional = typeof props.optional !== undefined ? props.optional : false;

  const organizations = useFragment(
    TargetSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrganization = organizations?.find(
    node => node.slug === props.currentOrganizationSlug,
  );

  const projects = currentOrganization?.projects.nodes;
  const currentProject = projects?.find(node => node.slug === props.currentProjectSlug);

  const targets = currentProject?.targets?.nodes;
  const currentTarget = targets?.find(node => node.slug === props.currentTargetSlug);
  const onValueChangeFunc =
    typeof props.onValueChange !== undefined ? props.onValueChange : () => {};

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
      ) : null
      }
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
      ) : null
      }
      {showProject ? <div className="italic text-gray-500">/</div> : null}
      {(targets?.length && currentOrganization && currentProject && currentTarget) || isOptional ? (
        <>
          <Select
            value={props.currentTargetSlug}
            onValueChange={
              onValueChangeFunc
                ? id => {
                    onValueChangeFunc(id);
                  }
                : id => {
                    void router.navigate({
                      to: '/$organizationSlug/$projectSlug/$targetSlug',
                      params: {
                        organizationSlug: props.currentOrganizationSlug,
                        projectSlug: props.currentProjectSlug,
                        targetSlug: id,
                      },
                    });
                  }
            }
          >
            <SelectTrigger variant="default" data-cy="target-picker-trigger">
              <div className="font-medium" data-cy="target-picker-current">
                {isOptional ? <SelectValue placeholder="Pick an option" /> : (currentTarget?.slug ?? '')}  
              </div>
            </SelectTrigger>
            <SelectContent>
              {isOptional ? (
                <SelectItem
                  key={'empty'}
                  value={'empty'}
                  data-cy={`project-picker-option-Unassigned`}
                >
                  Unassigned
                </SelectItem>
              ) : (
                <></>
              )}
              {targets ? (
                targets.map(target => (
                  <SelectItem
                    key={target.slug}
                    value={target.id}
                    data-cy={`target-picker-option-${target.slug}`}
                  >
                    {target.slug}
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
