import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { FragmentType, graphql, useFragment } from '@/gql';
import { SelectValue } from '@radix-ui/react-select';
import { Link, useRouter } from '@tanstack/react-router';

const ProjectSelector_OrganizationConnectionFragment = graphql(`
  fragment ProjectSelector_OrganizationConnectionFragment on OrganizationConnection {
    nodes {
      id
      slug
      projects {
        nodes {
          id
          slug
        }
      }
    }
  }
`);

export function ProjectSelector(props: {
  currentOrganizationSlug: string;
  currentProjectSlug: string;
  organizations: FragmentType<typeof ProjectSelector_OrganizationConnectionFragment> | null;
  onValueChange?: Function;
  optional?: boolean;
  showOrganization?: boolean;
}) {
  const optional = typeof props.optional !== 'undefined' ? props.optional : false;
  const showOrganization =
    typeof props.showOrganization !== 'undefined' ? props.showOrganization : true;
  const onValueChangeFunc =
    typeof props.onValueChange !== undefined ? props.onValueChange : undefined;
  const router = useRouter();

  const organizations = useFragment(
    ProjectSelector_OrganizationConnectionFragment,
    props.organizations,
  )?.nodes;

  const currentOrganization = organizations?.find(
    node => node.slug === props.currentOrganizationSlug,
  );

  const projects = currentOrganization?.projects.nodes;
  const currentProject = projects?.find(node => node.slug === props.currentProjectSlug);

  return (
    <>
      {showOrganization ? (
        currentOrganization ? (
          <Link
            to="/$organizationSlug"
            params={{ organizationSlug: props.currentOrganizationSlug }}
            className="max-w-[200px] shrink-0 truncate font-medium"
          >
            {currentOrganization.slug}
          </Link>
        ) : (
          <div className="h-5 w-48 max-w-[200px] animate-pulse rounded-full bg-gray-800" />
        )
      ) : (
        ''
      )}

      {(projects?.length && currentProject) || optional ? (
        <>
          {showOrganization ? <div className="italic text-gray-500">/</div> : <></>}
          <Select
            value={props.currentProjectSlug}
            onValueChange={
              onValueChangeFunc
                ? id => {
                    onValueChangeFunc(id);
                  }
                : id => {
                    void router.navigate({
                      to: '/$organizationSlug/$projectSlug',
                      params: {
                        organizationSlug: props.currentOrganizationSlug,
                        projectSlug: id,
                      },
                    });
                  }
            }
          >
            <SelectTrigger variant="default" data-cy="project-picker-trigger">
              <div className="font-medium" data-cy="project-picker-current">
                {optional ? <SelectValue placeholder="Pick an option" /> : ''}
                {currentProject && !optional ? currentProject.slug : ''}
              </div>
            </SelectTrigger>
            <SelectContent>
              {optional ? (
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
              {projects ? (
                projects.map(project => (
                  <SelectItem
                    key={project.slug}
                    value={project.slug}
                    data-cy={`project-picker-option-${project.slug}`}
                  >
                    {project.slug}
                  </SelectItem>
                ))
              ) : (
                <></>
              )}
            </SelectContent>
          </Select>
        </>
      ) : (
        <div className="h-5 w-48 animate-pulse rounded-full bg-gray-800" />
      )}
    </>
  );
}
