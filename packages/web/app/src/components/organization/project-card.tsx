import { ReactElement } from 'react';
import { ResourceCard } from '@/components/common/resource-card';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { Link } from '@tanstack/react-router';

export const ProjectCard_ProjectFragment = graphql(`
  fragment ProjectCard_ProjectFragment on Project {
    id
    slug
    type
  }
`);

const projectTypeFullNames = {
  [ProjectType.Federation]: 'Federation',
  [ProjectType.Stitching]: 'Schema Stitching',
  [ProjectType.Single]: 'Monolithic Schema',
};

export const ProjectCard = (props: {
  project: FragmentType<typeof ProjectCard_ProjectFragment> | null;
  cleanOrganizationId: string | null;
  highestNumberOfRequests: number;
  requestsOverTime: { date: string; value: number }[] | null;
  schemaVersionsCount: number | null;
  days: number;
}): ReactElement | null => {
  const project = useFragment(ProjectCard_ProjectFragment, props.project);

  return (
    <ResourceCard
      kind="project"
      name={project?.slug ?? null}
      subtitle={project ? projectTypeFullNames[project.type] : undefined}
      highestNumberOfRequests={props.highestNumberOfRequests}
      requestsOverTime={props.requestsOverTime}
      schemaVersionsCount={props.schemaVersionsCount}
      days={props.days}
      renderLink={children => (
        <Link
          // Vertical only: the card drops its body padding so the sparkline runs to the edge, and
          // the text row below supplies its own `px-4`.
          className="block pb-5 pt-4"
          to="/$organizationSlug/$projectSlug"
          disabled={props.cleanOrganizationId == null || project?.slug == null}
          params={{
            organizationSlug: props.cleanOrganizationId ?? 'unknown-yet',
            projectSlug: project?.slug ?? 'unknown-yet',
          }}
        >
          {children}
        </Link>
      )}
    />
  );
};
