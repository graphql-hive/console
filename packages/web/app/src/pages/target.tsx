import { ReactElement } from 'react';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { Callout } from '@/components/ui/callout';
import { EmptyList, noSchema, NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Button } from '@/components/ui/primitives/button/button';
import { Select } from '@/components/ui/primitives/floating/select/select';
import { ToggleGroup } from '@/components/ui/primitives/toggle-group/toggle-group';
import { QueryError } from '@/components/ui/query-error';
import { SdlViewer } from '@/components/ui/sdl-viewer';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { sdlModelPath } from '@/lib/sdl-definition-lookup';
import { getRouteApi, Link } from '@tanstack/react-router';

const schemaRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/',
);

type SchemaViewKind = 'api' | 'supergraph' | 'service';

const VIEW_DESCRIPTIONS: Record<SchemaViewKind, string> = {
  api: 'The composed schema your clients can query.',
  supergraph: 'The composed schema the router reads, including federation directives.',
  service: "This service's own published SDL, before composition.",
};

const SchemaView_ProjectFragment = graphql(`
  fragment SchemaView_ProjectFragment on Project {
    id
    type
  }
`);

const SchemaView_TargetFragment = graphql(`
  fragment SchemaView_TargetFragment on Target {
    id
    slug
    latestSchemaVersion {
      id
      schemas {
        edges {
          node {
            __typename
            ... on SingleSchema {
              id
              source
            }
            ... on CompositeSchema {
              id
              source
              service
              url
            }
          }
        }
      }
    }
    latestValidSchemaVersion {
      id
      sdl
      supergraph
    }
  }
`);

const viewerClassName = 'h-[calc(var(--content-height)-14rem)] min-h-96';

function SchemaView(props: {
  project: FragmentType<typeof SchemaView_ProjectFragment>;
  target: FragmentType<typeof SchemaView_TargetFragment>;
}): ReactElement | null {
  const project = useFragment(SchemaView_ProjectFragment, props.project);
  const target = useFragment(SchemaView_TargetFragment, props.target);
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const search = schemaRoute.useSearch();
  const navigate = schemaRoute.useNavigate();

  const { latestSchemaVersion, latestValidSchemaVersion } = target;
  if (!latestSchemaVersion) {
    return <NoSchemaVersion recommendedAction="publish" projectType={project.type} />;
  }

  const schemas = latestSchemaVersion.schemas.edges.map(edge => edge.node);
  if (!schemas.length) {
    return noSchema;
  }

  const isFederation = project.type === ProjectType.Federation;
  const isDistributed = isFederation || project.type === ProjectType.Stitching;

  if (!isDistributed) {
    const single = schemas.find(schema => schema.__typename === 'SingleSchema');
    return single ? (
      <SdlViewer
        sdl={single.source}
        modelPath={sdlModelPath(latestSchemaVersion.id, 'schema')}
        className={viewerClassName}
      />
    ) : (
      noSchema
    );
  }

  const services = schemas.flatMap(schema =>
    schema.__typename === 'CompositeSchema' ? [schema] : [],
  );
  const requestedView = search.view ?? (search.service ? 'service' : 'api');
  const view: SchemaViewKind =
    requestedView === 'supergraph' && !isFederation ? 'api' : requestedView;
  const serviceName = search.service ?? services[0]?.service ?? undefined;
  const service = services.find(schema => schema.service === serviceName);

  const selectView = (next: string) => {
    void navigate({
      search:
        next === 'service'
          ? { service: serviceName }
          : next === 'supergraph'
            ? { view: 'supergraph' }
            : {},
    });
  };

  const composedSdl =
    view === 'api'
      ? latestValidSchemaVersion?.sdl
      : view === 'supergraph'
        ? latestValidSchemaVersion?.supergraph
        : null;

  let body: ReactElement;
  if (view === 'service') {
    body = service ? (
      <SdlViewer
        sdl={service.source}
        modelPath={sdlModelPath(latestSchemaVersion.id, `service/${service.service ?? ''}`)}
        className={viewerClassName}
      />
    ) : (
      <EmptyList
        title="Service not found"
        description="You can publish the missing service with Hive CLI"
      />
    );
  } else if (latestValidSchemaVersion && composedSdl) {
    body = (
      <SdlViewer
        sdl={composedSdl}
        modelPath={sdlModelPath(latestValidSchemaVersion.id, view)}
        className={viewerClassName}
      />
    );
  } else {
    body = (
      <EmptyList
        title="No composed schema yet"
        description="None of the published versions composed. Pick a service to see its own SDL."
      />
    );
  }

  const showsOlderComposition =
    view !== 'service' &&
    !!latestValidSchemaVersion &&
    latestValidSchemaVersion.id !== latestSchemaVersion.id;

  return (
    <>
      <div className="mb-3 flex flex-row flex-wrap items-center gap-4">
        <ToggleGroup
          aria-label="Schema view"
          value={view}
          onValueChange={selectView}
          options={[
            { value: 'api', label: 'API schema' },
            ...(isFederation ? [{ value: 'supergraph', label: 'Supergraph' }] : []),
            { value: 'service', label: 'Service' },
          ]}
        />
        {view === 'service' ? (
          <Select
            aria-label="Service"
            options={services.map(schema => ({
              value: schema.service as string,
              label: schema.service as string,
              description: schema.url,
            }))}
            value={serviceName}
            onValueChange={name => {
              void navigate({ search: { service: name } });
            }}
            placeholder="Select service"
            searchable
            searchPlaceholder="Search service..."
            size="compact"
            width="lg"
          />
        ) : null}
      </div>
      <p className="mb-3 text-fg-secondary">
        {VIEW_DESCRIPTIONS[view]}
        {view === 'service' && service?.url ? <span className="ml-2">{service.url}</span> : null}
      </p>
      {showsOlderComposition ? (
        <Callout type="warning" className="mt-0 mb-3 text-sm">
          The latest publish did not compose; showing the last composed version.{' '}
          <Link
            to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
            params={{
              organizationSlug,
              projectSlug,
              targetSlug,
              versionId: latestSchemaVersion.id,
            }}
            className="font-medium underline hover:no-underline"
          >
            See what failed
          </Link>
        </Callout>
      ) : null}
      {body}
    </>
  );
}

export const TargetSchemaPageQuery = graphql(`
  query TargetSchemaPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      ...SchemaView_ProjectFragment
      target: targetBySlug(targetSlug: $targetSlug) {
        ...SchemaView_TargetFragment
      }
    }
  }
`);

function TargetSchemaPage() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: TargetSchemaPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
    },
  });

  if (query.error) {
    return <QueryError organizationSlug={organizationSlug} error={query.error} />;
  }

  const currentProject = query.data?.project;
  const target = currentProject?.target;
  const params = { organizationSlug, projectSlug, targetSlug };

  return (
    <LayoutContent>
      <div className="flex flex-row items-center justify-between py-6">
        <div>
          <Title>Schema</Title>
          <Subtitle>The latest published schema.</Subtitle>
        </div>
        <div className="flex flex-row items-center gap-x-4">
          <Button
            variant="outline"
            render={
              <Link to="/$organizationSlug/$projectSlug/$targetSlug/explorer" params={params} />
            }
          >
            Browse in Explorer
          </Button>
          <span className="italic">|</span>
          <Button
            variant="outline"
            render={
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/explorer/unused"
                params={params}
              />
            }
          >
            Unused schema
          </Button>
          <span className="italic">|</span>
          <Button
            variant="outline"
            render={
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated"
                params={params}
              />
            }
          >
            Deprecated schema
          </Button>
        </div>
      </div>
      <div>
        {query.fetching ? null : currentProject && target ? (
          <SchemaView project={currentProject} target={target} />
        ) : null}
      </div>
    </LayoutContent>
  );
}

export function TargetPage() {
  return (
    <>
      <Meta title="Schema" />
      <TargetSchemaPage />
    </>
  );
}
