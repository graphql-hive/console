import { createPreview, defineControls, type NavPath } from 'react-foundry';
import { ProjectCard, ProjectCard_ProjectFragment } from '@/components/organization/project-card';
import { makeFragmentData } from '@/gql';
import { ProjectType } from '@/gql/graphql';

export const nav: NavPath = 'Migration/Live/ProjectCard';

/**
 * The real `ProjectCard` from the organization overview, rendered without the app.
 *
 * Two things make this work. `useFragment` is identity at runtime, so `makeFragmentData` is enough
 * to stand in for a query result, and it is checked against the fragment's shape: add a field to
 * `ProjectCard_ProjectFragment` and this fixture stops compiling. And `Link` resolves because every
 * preview renders inside the stand-in router from `foundry.router.tsx`.
 *
 * ProjectCard takes its chart data as plain props, so nothing here needs urql.
 */
const project = (slug: string, type: ProjectType) =>
  makeFragmentData(
    { __typename: 'Project' as const, id: `project-${slug}`, slug, type },
    ProjectCard_ProjectFragment,
  );

/** 30 days of request volume, shaped like a real project rather than a flat line. */
function series(days: number, peak: number) {
  const start = new Date(Date.UTC(2026, 6, 8)).getTime();
  return Array.from({ length: days }, (_, i) => ({
    date: new Date(start + i * 86_400_000).toISOString(),
    value: Math.max(0, Math.round(peak * (0.55 + 0.45 * Math.sin(i / 3)) - i * (peak / 200))),
  }));
}

export const Default = createPreview(() => (
  <div className="w-[26rem]">
    <ProjectCard
      project={project('graphql-hive', ProjectType.Federation)}
      cleanOrganizationId="the-guild"
      highestNumberOfRequests={180_000}
      requestsOverTime={series(30, 180_000)}
      schemaVersionsCount={42}
      days={30}
    />
  </div>
));

/** What the org overview actually shows: several cards in a grid, varying by traffic and type. */
export const InAGrid = createPreview(() => (
  <div className="grid w-[64rem] grid-cols-3 gap-4">
    <ProjectCard
      project={project('graphql-hive', ProjectType.Federation)}
      cleanOrganizationId="the-guild"
      highestNumberOfRequests={180_000}
      requestsOverTime={series(30, 180_000)}
      schemaVersionsCount={42}
      days={30}
    />
    <ProjectCard
      project={project('codegen', ProjectType.Single)}
      cleanOrganizationId="the-guild"
      highestNumberOfRequests={180_000}
      requestsOverTime={series(30, 24_000)}
      schemaVersionsCount={7}
      days={30}
    />
    <ProjectCard
      project={project('mesh', ProjectType.Stitching)}
      cleanOrganizationId="the-guild"
      highestNumberOfRequests={180_000}
      requestsOverTime={series(30, 900)}
      schemaVersionsCount={1}
      days={30}
    />
  </div>
));

/** The loading state: `project` null, so the skeleton bars show instead of the counts. */
export const Loading = createPreview(() => (
  <div className="w-[26rem]">
    <ProjectCard
      project={null}
      cleanOrganizationId={null}
      highestNumberOfRequests={0}
      requestsOverTime={null}
      schemaVersionsCount={null}
      days={30}
    />
  </div>
));

export const Playground = createPreview({
  controls: defineControls({
    slug: { type: 'text', default: 'graphql-hive' },
    type: {
      type: 'radio',
      options: [ProjectType.Federation, ProjectType.Single, ProjectType.Stitching],
      default: ProjectType.Federation,
    },
    peak: { type: 'range', min: 0, max: 200_000, step: 1000, default: 180_000 },
    schemaVersionsCount: { type: 'number', default: 42 },
    days: { type: 'range', min: 7, max: 90, step: 1, default: 30 },
    loading: { type: 'boolean', default: false },
  }),
  render: v => (
    <div className="w-[26rem]">
      <ProjectCard
        project={v.loading ? null : project(v.slug, v.type)}
        cleanOrganizationId={v.loading ? null : 'the-guild'}
        highestNumberOfRequests={200_000}
        requestsOverTime={v.loading ? null : series(v.days, v.peak)}
        schemaVersionsCount={v.loading ? null : v.schemaVersionsCount}
        days={v.days}
      />
    </div>
  ),
});
