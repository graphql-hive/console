import { ReactElement } from 'react';
import { XIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { Accordion } from '@/components/base/accordion/accordion';
import { Button } from '@/components/base/button/button';
import { Card } from '@/components/base/card/card';
import { Select } from '@/components/base/floating/select/select';
import { Page, TargetLayout } from '@/components/layouts/target';
import { EmptyList, noSchema, NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { GraphQLBlock, GraphQLHighlight } from '@/components/v2/graphql-block';
import { DocumentType, FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { Link, useRouter } from '@tanstack/react-router';

type CompositeSchema = Extract<
  DocumentType<typeof SchemaView_SchemaFragment>,
  {
    __typename: 'CompositeSchema';
  }
>;

type SingleSchema = Extract<
  DocumentType<typeof SchemaView_SchemaFragment>,
  {
    __typename: 'SingleSchema';
  }
>;

function isCompositeSchema(
  schema: DocumentType<typeof SchemaView_SchemaFragment>,
): schema is CompositeSchema {
  return schema.__typename === 'CompositeSchema';
}

/** The service's name, an anchor for deep links, and its URL. */
function serviceHeader(schema: CompositeSchema) {
  return (
    <div>
      <div className="text-base" id={schema.service ? `service-${schema.service}` : undefined}>
        {schema.service ?? 'SDL'}
      </div>
      {schema.url ? <div className="text-neutral-10 text-xs font-normal">{schema.url}</div> : null}
    </div>
  );
}

function serviceSchema(schema: CompositeSchema) {
  return (
    <div className="p-2">
      <GraphQLHighlight code={schema.source} />
    </div>
  );
}

function Schemas(props: { schemas?: readonly CompositeSchema[]; schema?: SingleSchema }) {
  if (props.schema) {
    return (
      <GraphQLBlock
        sdl={props.schema.source}
        url={'url' in props.schema && typeof props.schema.url === 'string' ? props.schema.url : ''}
      />
    );
  }

  if (!props.schemas) {
    console.error('No schema or schemas props provided');
    return null;
  }

  if (props.schemas.length > 1) {
    return (
      <Accordion
        variant="boxed"
        items={props.schemas.map(schema => ({
          value: schema.id,
          label: serviceHeader(schema),
          content: serviceSchema(schema),
        }))}
      />
    );
  }

  const schema = props.schemas[0];

  if (!schema) {
    return (
      <EmptyList
        title="Service not found"
        description="You can publish the missing service with Hive CLI"
      />
    );
  }

  // One service has nothing to collapse, so it is a card, not an accordion locked open.
  return (
    <Card>
      {serviceHeader(schema)}
      {serviceSchema(schema)}
    </Card>
  );
}

const SchemaView_ProjectFragment = graphql(`
  fragment SchemaView_ProjectFragment on Project {
    id
    type
  }
`);

const SchemaView_SchemaFragment = graphql(`
  fragment SchemaView_SchemaFragment on Schema {
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
            ...SchemaView_SchemaFragment
          }
        }
      }
    }
  }
`);

function SchemaView(props: {
  project: FragmentType<typeof SchemaView_ProjectFragment>;
  target: FragmentType<typeof SchemaView_TargetFragment>;
}): ReactElement | null {
  const project = useFragment(SchemaView_ProjectFragment, props.project);
  const target = useFragment(SchemaView_TargetFragment, props.target);
  const router = useRouter();
  const selectedServiceName =
    'service' in router.latestLocation.search &&
    typeof router.latestLocation.search.service === 'string'
      ? router.latestLocation.search.service
      : null;

  const reset = () => {
    void router.navigate({
      search: {},
    });
  };

  const schemas = useFragment(
    SchemaView_SchemaFragment,
    target.latestSchemaVersion?.schemas?.edges?.map(edge => edge.node),
  );

  const isDistributed =
    project.type === ProjectType.Federation || project.type === ProjectType.Stitching;

  const { latestSchemaVersion } = target;
  if (!latestSchemaVersion) {
    return <NoSchemaVersion recommendedAction="publish" projectType={project.type} />;
  }

  if (!latestSchemaVersion.schemas.edges.length) {
    return noSchema;
  }

  const compositeSchemas = schemas?.filter(isCompositeSchema) as CompositeSchema[];
  const singleSchema = schemas?.filter(schema => !isCompositeSchema(schema))[0] as
    | SingleSchema
    | undefined;
  const schemasToDisplay = selectedServiceName
    ? compositeSchemas.filter(schema => schema.service === selectedServiceName)
    : compositeSchemas;

  return (
    <>
      <div className="mb-5 flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-x-4">
          {isDistributed && schemas && schemas.length > 1 && (
            <>
              <Select
                aria-label="Service"
                options={compositeSchemas.map(schema => ({
                  value: schema.service as string,
                  label: schema.service as string,
                  description: schema.url,
                }))}
                value={selectedServiceName ?? undefined}
                onValueChange={serviceName => {
                  void router.navigate({
                    search: { service: serviceName },
                  });
                }}
                placeholder="Select service"
                searchable
                searchPlaceholder="Search service..."
                width="lg"
              />
              {selectedServiceName ? (
                <Button variant="outline" onClick={reset}>
                  <XIcon width={16} height={16} />
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
      {isDistributed ? <Schemas schemas={schemasToDisplay} /> : <Schemas schema={singleSchema} />}
    </>
  );
}

const TargetSchemaPageQuery = graphql(`
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

function TargetSchemaPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [query] = useQuery({
    query: TargetSchemaPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });

  if (query.error) {
    return <QueryError organizationSlug={props.organizationSlug} error={query.error} />;
  }

  const currentProject = query.data?.project;
  const target = currentProject?.target;

  return (
    <TargetLayout
      targetSlug={props.targetSlug}
      projectSlug={props.projectSlug}
      organizationSlug={props.organizationSlug}
      page={Page.Schema}
    >
      <div className="flex flex-row items-center justify-between py-6">
        <div>
          <Title>Schema</Title>
          <Subtitle>The latest published schema.</Subtitle>
        </div>
        <div className="flex flex-row items-center gap-x-4">
          <Button
            variant="outline"
            render={
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/explorer/unused"
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                }}
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
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                }}
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
    </TargetLayout>
  );
}

export function TargetPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="Schema" />
      <TargetSchemaPage
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
      />
    </>
  );
}
